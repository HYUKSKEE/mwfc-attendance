import { getConfig } from "./config";
import { getJson, setJson } from "./store";
import type {
  AttendanceBase, MergedData, Meetup, Note, Overrides,
} from "./types";
import { OFFSET } from "./somoim/client";

// run_attendance.py 의 노트/보정/취소/수동벙/버킷/_merged_data 이식

const EMPTY_BASE: AttendanceBase = {
  group: { name: "", member_count: null, events: [] },
  generated: "",
  members: [],
};

// ---------- 회원 메모 ----------
export const loadNotes = () => getJson<Record<string, Note>>("member_notes", {});

const clip10 = (v: unknown) => {
  const n = Math.trunc(Number(v) || 0);
  return Math.max(0, Math.min(10, n));
};

export async function saveNote(
  mid: string,
  p: { tags?: unknown[]; memo?: string; nick?: string; noshow?: unknown; late?: unknown; roles?: unknown[] },
) {
  const notes = await loadNotes();
  const entry: Note = {
    nick: (p.nick ?? "").trim().slice(0, 40),
    tags: (p.tags ?? []).map((t) => String(t).trim()).filter(Boolean).slice(0, 20),
    memo: (p.memo ?? "").trim().slice(0, 2000),
    noshow: clip10(p.noshow),
    late: clip10(p.late),
    roles: (p.roles ?? []).filter((r): r is string => r === "admin" || r === "pacer"),
  };
  if (!entry.nick && !entry.tags.length && !entry.memo && !entry.noshow && !entry.late && !entry.roles.length) {
    delete notes[mid];
  } else {
    notes[mid] = entry;
  }
  await setJson("member_notes", notes);
  return entry;
}

// ---------- 장소 버킷 ----------
export const loadPlaceBuckets = () => getJson<Record<string, string>>("place_buckets", {});

export async function savePlaceBuckets(mapping: unknown) {
  const clean: Record<string, string> = {};
  if (mapping && typeof mapping === "object") {
    for (const [k, v] of Object.entries(mapping as Record<string, unknown>)) {
      const key = String(k).trim();
      const val = String(v ?? "").trim().slice(0, 60);
      if (key && val) clean[key] = val;
    }
  }
  await setJson("place_buckets", clean);
  return clean;
}

// ---------- 참석자 보정 / 취소 / 수동 벙 ----------
export const loadOverrides = () => getJson<Overrides>("meetup_overrides", {});
export const loadManual = () => getJson<Meetup[]>("manual_meetups", []);
export const saveManual = (l: Meetup[]) => setJson("manual_meetups", l);

export async function saveOverride(wt: string, add: string[], remove: string[]) {
  const ov = await loadOverrides();
  const a = [...new Set(add)];
  const r = [...new Set(remove)];
  if (!a.length && !r.length) delete ov[wt];
  else ov[wt] = { add: a, remove: r };
  await setJson("meetup_overrides", ov);
}

export async function setCancelled(wt: string, flag: boolean) {
  const s = new Set((await getJson<string[]>("cancelled_meetups", [])).map(String));
  if (flag) s.add(wt);
  else s.delete(wt);
  await setJson("cancelled_meetups", [...s].sort());
  return s.has(wt);
}

/** 'YYYY-MM-DD' → 정렬용 w_t (KST 정오 기준) */
export function dateToWt(dateStr: string): number {
  const m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(dateStr);
  if (!m) return Math.floor(Date.now() / 1000) - OFFSET;
  const ms = Date.UTC(+m[1], +m[2] - 1, +m[3], 12, 0) - 9 * 3600 * 1000;
  return Math.floor(ms / 1000) - OFFSET;
}

// ---------- 병합 ----------
/** 자동수집 원본(회원 + 아카이브 벙) — 보정 적용 전 */
export async function loadRawMeetups(): Promise<Meetup[]> {
  const archive = await getJson<Record<string, Meetup>>("meetups_archive", {});
  const excl = getConfig().excludeKeywords;
  // 제외 키워드는 읽을 때 적용(설정을 바꾸면 바로 복구됨)
  return Object.values(archive).filter(
    (mt) => !excl.some((k) => (mt.title || "").includes(k)),
  );
}

/** 자동수집 + 수동 벙 + 참석자 보정 + 취소를 합치고 회원 지표를 재계산 */
export async function mergedData(): Promise<MergedData> {
  const base = await getJson<AttendanceBase>("attendance_data", EMPTY_BASE);
  const [rawMeetups, ov, manual, cancelledArr] = await Promise.all([
    loadRawMeetups(),
    loadOverrides(),
    loadManual(),
    getJson<string[]>("cancelled_meetups", []),
  ]);
  const cancelled = new Set(cancelledArr.map(String));
  const byMid = new Map(base.members.map((m) => [m.mid, m]));

  const meetups: Meetup[] = rawMeetups.map((m) => ({ ...m }));
  for (const mm of manual) {
    meetups.push({
      id: mm.id, title: mm.title ?? "", date: mm.date, date_str: mm.date_str ?? "",
      w_t: mm.w_t ?? 0, place: mm.place ?? "",
      attendee_ids: [...new Set(mm.attendee_ids ?? [])],
      cat: "E", source: "manual", live: true,
    });
  }

  for (const mt of meetups) {
    const wt = String(mt.w_t);
    let ids = [...new Set(mt.attendee_ids ?? [])];
    const o = ov[wt];
    if (o) {
      for (const a of o.add) if (!ids.includes(a)) ids.push(a);
      const rem = new Set(o.remove);
      ids = ids.filter((i) => !rem.has(i));
      mt.manual = true;
    }
    mt.attendee_ids = ids;
    mt.attendee_names = ids.map((i) => byMid.get(i)?.name ?? `(미확인:${i.slice(0, 6)})`);
    mt.count = ids.length;
    mt.cancelled = cancelled.has(wt); // 취소된 벙은 출석 미인정
  }
  meetups.sort((a, b) => b.w_t - a.w_t);

  const members = base.members.map((m) => {
    const hist = [];
    let lastWt = 0;
    let lastDs = "";
    for (const mt of meetups) {
      if (mt.cancelled || !mt.attendee_ids.includes(m.mid)) continue;
      hist.push({ title: mt.title, date: mt.date_str, place: mt.place, w_t: mt.w_t ?? 0 });
      if ((mt.w_t ?? 0) > lastWt) { lastWt = mt.w_t; lastDs = mt.date_str; }
    }
    hist.sort((a, b) => b.w_t - a.w_t);
    return { ...m, history: hist, attend_count: hist.length, last_attended: lastWt ? lastDs : "기록없음" };
  });

  return { ...base, members, meetups };
}
