import { OFFSET, post, type SomoimCred, credFromEnv } from "./client";
import { getConfig } from "../config";
import { getJson, setJson } from "../store";
import type { AttendanceBase, Group, Meetup, Member } from "../types";

// somoim_attendance.py + run_attendance.py(collect_data) 이식

const KST_MS = 9 * 3600 * 1000;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** 소모임 시각값(저장값) → YYYY-MM-DD (KST) */
export function fmt(ts: number | undefined | null): string {
  if (!ts) return "";
  return new Date((ts + OFFSET) * 1000 + KST_MS).toISOString().slice(0, 10);
}

export function kstNowStr(): string {
  return new Date(Date.now() + KST_MS).toISOString().slice(0, 16).replace("T", " ");
}

type RawMember = Record<string, unknown>;

/** sync_gi → 회원 명단(탈퇴 제외) + 탈퇴·강퇴자 가입일 + 그룹 정보 */
export async function getMembers(cred: SomoimCred) {
  const cfg = getConfig();
  const body = {
    ver: 633, os: "01", pw: cred.PW, it: "180000", gid: cred.GID,
    ig: "Y", nid: cred.NID, cache: "N", ips: "N", cp: "Y",
  };
  const { data: j } = await post<{
    res?: number; m?: RawMember[]; g?: Record<string, unknown>;
  }>(`/group_infos/sync_gi/${cred.MY_WID}.json`, body);

  if (j.res !== 100) {
    throw new Error(`sync_gi 실패 res=${j.res} (100 이 정상, 803=인증 실패 → SOMOIM_PW 확인)`);
  }

  const members: Record<string, Member> = {};
  const departed: string[] = [];
  for (const m of Array.isArray(j.m) ? j.m : []) {
    if (!m || typeof m !== "object") continue;
    const mid = m.mid as string | undefined;
    if (!mid) continue;
    if (m.ban === "Y") { // 탈퇴/강퇴: 회원 목록엔 넣지 않고 가입일만 보관(신규 가입 통계용)
      const d = fmt(m.j_t as number);
      if (d) departed.push(d);
      continue;
    }
    members[mid] = {
      mid,
      name: (m.mn as string) ?? "",
      joined: (m.j_t as number) ?? 0,
      joined_date: fmt(m.j_t as number),
      last_visit: (m.v_t as number) ?? 0,
      last_visit_date: fmt(m.v_t as number),
      intro_written: m.i_m === "Y",
      key: (m.key as string) ?? "",
      banned: false,
    };
  }

  // 계정 주인은 sync_gi 명단에 빠져 있어 수동 추가
  if (!members[cred.MY_WID]) {
    members[cred.MY_WID] = {
      mid: cred.MY_WID,
      name: cfg.ownerName,
      joined: cfg.ownerJoined,
      joined_date: cfg.ownerJoined ? fmt(cfg.ownerJoined) : "—",
      last_visit: 0,
      last_visit_date: "—",
      intro_written: true,
      key: "",
      banned: false,
      is_owner: true,
    };
  }

  const g = j.g ?? {};
  const group: Group = {
    name: (g.gn as string) ?? "",
    member_count: g.gmc,
    events: [],
  };
  for (const i of ["", "2", "3", "4"]) {
    const en = g[`en${i}`];
    if (en && en !== "none") {
      group.events.push({
        name: en, date: g[`e_d${i}`], time: g[`e_t${i}`], place: g[`el${i}`],
      });
    }
  }
  return { members, group, departed };
}

type RawArticle = { id?: string; w_t?: number; cat?: string; at?: string };

/** 수집 기간(일): 30~180. 이보다 오래된 벙은 가져오지 않는다 */
export const MIN_COLLECT_DAYS = 30;
export const MAX_COLLECT_DAYS = 180;
const clampDays = (d: number) =>
  Math.max(MIN_COLLECT_DAYS, Math.min(MAX_COLLECT_DAYS, Math.trunc(d) || MAX_COLLECT_DAYS));
const lowerBound = (days: number) => Math.floor((Date.now() - days * 86400_000) / 1000) - OFFSET;

/** select_articles 페이징(현재→과거). 최근 days일(30~180)까지만 */
export async function getArticles(cred: SomoimCred, days: number) {
  const lowerTs = lowerBound(clampDays(days));
  let cursor = Math.floor((Date.now() + 5 * 60_000) / 1000) - OFFSET;

  const articles: RawArticle[] = [];
  const seen = new Set<string>();
  for (;;) {
    const body = {
      ver: 633, os: "a1", pw: "", gid: cred.GID, it: "180000",
      g_t: cred.G_T, s_t: cursor, cat: "all", mn: "", cp: "Y",
    };
    const { data: j } = await post<{ cs?: RawArticle[]; eof?: string }>(
      `/articles/select_articles/${cred.MY_WID}.json`, body,
    );
    const cs = j.cs ?? [];
    if (!cs.length) break;
    let stop = false;
    for (const a of cs) {
      const wt = a.w_t ?? 0;
      if (lowerTs && wt < lowerTs) { stop = true; break; }
      if (a.id && seen.has(a.id)) continue;
      if (a.id) seen.add(a.id);
      articles.push(a);
    }
    if (stop || j.eof === "Y") break;
    const oldest = Math.min(...cs.map((a) => a.w_t ?? cursor));
    if (oldest >= cursor) break;
    cursor = oldest;
    await sleep(250);
  }
  return articles;
}

/** select_comments → 정모 참석자(linked_event.attendee_ids) */
export async function fetchEventAttendees(cred: SomoimCred, a: RawArticle) {
  const aRk = a.w_t ?? 0;
  const body = {
    ver: 633, os: "a1", pw: cred.PW, gid: cred.GID, it: "180000",
    aid: a.id, s_t: 0, new: "Y",
    a_pk: cred.GID + String(aRk), a_hk: cred.GID, a_rk: aRk,
    gt: 1, aim: false, mn: cred.MN, cp: "Y",
  };
  try {
    const { data: j } = await post<{
      linked_event?: { attendee_ids?: string[]; en?: string; e_d?: number; e_t?: number; el?: string };
    }>(`/comments/select_comments/${cred.MY_WID}.json`, body);
    const ev = j.linked_event ?? {};
    return { ev, ids: ev.attendee_ids ?? [] };
  } catch {
    return null;
  }
}

/** 수집 실행: 회원 + 벙(아카이브 upsert) 을 저장소에 반영 */
export async function collectData(rawDays: number) {
  const days = clampDays(rawDays);
  const cred = credFromEnv();
  const cfg = getConfig();

  const { members, group, departed } = await getMembers(cred);
  const articles = await getArticles(cred, days);
  const eventArticles = articles.filter(
    (a) => cfg.eventCats === null || (a.cat && cfg.eventCats.has(a.cat)),
  );

  // 참석자 조회: 동시 4개, 요청 사이 약간의 간격(과도한 호출 방지)
  const fresh: Meetup[] = [];
  let next = 0;
  const worker = async () => {
    while (next < eventArticles.length) {
      const a = eventArticles[next++];
      const res = await fetchEventAttendees(cred, a);
      fresh.push({
        title: res?.ev.en || a.at || "",
        date: res?.ev.e_d ?? null,
        time: res?.ev.e_t ?? null,
        w_t: a.w_t ?? 0,
        date_str: fmt(a.w_t),
        place: res?.ev.el ?? "",
        attendee_ids: res?.ids ?? [],
        cat: a.cat,
        live: true,
      });
      await sleep(120);
    }
  };
  await Promise.all([worker(), worker(), worker(), worker()]);

  // 아카이브 누적: 소모임에서 삭제돼도 유지. 이번에 안 잡힌 벙은 live=false(보관)
  const archive = await getJson<Record<string, Meetup>>("meetups_archive", {});
  const freshKeys = new Set<string>();
  for (const mt of fresh) {
    // 조회 실패(res=null)로 참석자가 비면 기존 아카이브 값을 덮어쓰지 않는다
    const k = String(mt.w_t);
    freshKeys.add(k);
    const prev = archive[k];
    if (prev && !mt.attendee_ids.length && prev.attendee_ids?.length) {
      archive[k] = { ...prev, live: true };
    } else {
      archive[k] = { ...mt, time: mt.time ?? prev?.time ?? null };
    }
  }
  // 수집 기간 밖의 오래된 벙은 '삭제됨'이 아니므로 live 판정 대상에서 제외
  const lowerWt = lowerBound(days);
  for (const [k, mt] of Object.entries(archive)) {
    if (freshKeys.has(k)) continue;
    if (mt.w_t < lowerWt) continue;
    mt.live = false;
  }
  await setJson("meetups_archive", archive);

  const base: AttendanceBase = {
    group,
    generated: kstNowStr(),
    members: Object.values(members).sort((a, b) => a.joined - b.joined),
    departed: departed.sort(),
  };
  await setJson("attendance_data", base);
  return { members: base.members.length, meetups: Object.keys(archive).length, generated: base.generated };
}

// ---------- 가입인사 / 사진 (지연 로딩) ----------
const IMG_RE = /<img[^>]+src="([^"]+)"/i;

const NB = String.raw`(?=이에요|예요|이예요|입니다|입니당|이라고|라고|이구요|이고|임다|이에용|예용|이라|라는|이라는|님|씨|[\s,.!?~·()\[\]/\n]|$)`;
const NAME_CUE_RE = [
  new RegExp(String.raw`(?:저는|나는|전|제?\s*이름은)\s*([가-힣]{2,4}?)\s*(?:입니다|이에요|예요|이라고|라고|입니당|이고|예용|이예요|임다)`, "g"),
  new RegExp(String.raw`안녕하세요[^가-힣]{0,8}([가-힣]{2,4}?)\s*(?:입니다|이에요|예요|이라고|라고|입니당|이에용)`, "g"),
  new RegExp(String.raw`(?:이름|성함)\s*[:은는이가]?\s*([가-힣]{2,4}?)` + NB, "g"),
  new RegExp(String.raw`([가-힣]{2,4}?)\s*(?:이라고\s*합니다|라고\s*합니다|입니다|이라고해요)`, "g"),
];
const NAME_STOP = new Set([
  "안녕하세요", "반갑습니다", "반가워요", "잘부탁", "참여", "운동", "러닝", "달리기",
  "여러분", "처음", "오늘", "가입", "인사", "신입", "초보", "회원", "모임", "크루",
  "감사", "열심히", "앞으로", "자주", "종종", "그냥", "제이름", "이름은",
]);

export function extractNameFromIntro(text: string | undefined): string | null {
  if (!text) return null;
  const head = text.trim().slice(0, 140);
  for (const rx of NAME_CUE_RE) {
    rx.lastIndex = 0;
    for (const mt of head.matchAll(rx)) {
      const cand = (mt[1] ?? "").trim();
      if (cand && !NAME_STOP.has(cand)) return cand;
    }
  }
  return null;
}

type Atc = { cat?: string; c?: string; chtml?: string };

async function fetchArticleByWt(cred: SomoimCred, wT: number): Promise<Atc | null> {
  const body = {
    ver: 633, os: "a1", pw: cred.PW, gid: cred.GID, it: "180000",
    s_t: 0, new: "Y",
    a_pk: cred.GID + String(wT), a_hk: cred.GID, a_rk: wT,
    gt: 1, aim: false, mn: cred.MN, cp: "Y",
  };
  try {
    const { data: j } = await post<{ atc?: Atc }>(
      `/comments/select_comments/${cred.MY_WID}.json`, body,
    );
    return j.atc && typeof j.atc === "object" ? j.atc : null;
  } catch {
    return null;
  }
}

export type Intro = { photo: string | null; intro: string | null; intro_name: string | null };

/** 회원 작성글을 오래된 순으로 최대 N개 열어 가입인사(cat=J) 탐색 */
export async function fetchMemberIntro(mid: string): Promise<Intro | null> {
  const cred = credFromEnv();
  const max = getConfig().introMaxCheck;
  let arts: Array<{ w_t?: number }> = [];
  try {
    const { data: j } = await post<{ atcs?: Array<{ w_t?: number }> }>(
      `/articles/select_profile_articles/${cred.MY_WID}.json`,
      { ver: 633, os: "a1", pw: cred.PW, gid: cred.GID, mid, s_t: 0, cp: "Y" },
    );
    arts = j.atcs ?? [];
  } catch {
    return null;
  }
  arts.sort((a, b) => (a.w_t ?? 0) - (b.w_t ?? 0));
  for (const a of arts.slice(0, max)) {
    if (!a.w_t) continue;
    const atc = await fetchArticleByWt(cred, a.w_t);
    if (!atc) continue;
    if (atc.cat === "J") {
      const m = IMG_RE.exec(atc.chtml ?? "");
      const intro = (atc.c ?? "").trim();
      return { photo: m ? m[1] : null, intro, intro_name: extractNameFromIntro(intro) };
    }
    await sleep(150);
  }
  return null;
}

/** 캐시(저장소) 우선 조회. 사진은 공개 S3 URL 을 그대로 사용 */
export async function lazyMemberIntro(mid: string): Promise<Intro> {
  const key = `intro_${mid}`;
  const cached = await getJson<Intro | null>(key, null);
  if (cached) return cached;
  const res = (await fetchMemberIntro(mid)) ?? { photo: null, intro: null, intro_name: null };
  await setJson(key, res);
  return res;
}
