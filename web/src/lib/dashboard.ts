import type { MergedData } from "./types";
import { addDays } from "./url";

// 대시보드 집계 (순수 함수). 취소된 벙·오늘 이후 벙은 제외하고,
// '참석'은 신청자 중 당일취소·무단불참이 아닌 사람만 센다.

export const RANGES = [30, 90, 180] as const;

const MS = 86400_000;
const dow = (d: string) => new Date(d + "T00:00:00Z").getUTCDay();
const diff = (a: string, b: string) => Math.round((Date.parse(a + "T00:00:00Z") - Date.parse(b + "T00:00:00Z")) / MS);
const mondayOf = (d: string) => addDays(d, -((dow(d) + 6) % 7));
const md = (d: string) => `${Number(d.slice(5, 7))}/${Number(d.slice(8, 10))}`;

type M = {
  day: string; title: string; place: string; w_t: number;
  signed: number; ids: string[]; late: string[]; cancel: string[]; noshow: string[];
};

export type Period = { meetups: number; total: number; avg: number; active: number };

export function buildDashboard(data: MergedData, today: string, range: number) {
  const members = data.members.filter((m) => !m.banned);
  const nameOf = new Map(members.map((m) => [m.mid, m.name]));
  const known = new Set(nameOf.keys());

  const all: M[] = data.meetups
    .filter((m) => !m.cancelled && m.day && m.day <= today)
    .map((m) => {
      const cancel = m.cancel_ids ?? [];
      const noshow = m.noshow_ids ?? [];
      const out = new Set([...cancel, ...noshow]);
      return {
        day: m.day!, title: m.title, place: (m.place ?? "").trim(), w_t: m.w_t,
        signed: m.attendee_ids.length,
        ids: m.attendee_ids.filter((i) => !out.has(i)),
        late: (m.late_ids ?? []).filter((i) => !out.has(i)),
        cancel, noshow,
      };
    });

  const from = addDays(today, -(range - 1));
  const prevTo = addDays(from, -1);
  const prevFrom = addDays(from, -range);
  const earliest = all.reduce((e, m) => (m.day < e ? m.day : e), today);
  // 이전 기간 데이터가 충분히 있을 때만 증감을 보여준다(수집 범위 밖이면 비교 불가)
  const hasPrev = all.length > 0 && earliest <= addDays(prevFrom, 6);

  const inRange = (m: M, a: string, b: string) => m.day >= a && m.day <= b;
  const period = (a: string, b: string): Period => {
    const ms = all.filter((m) => inRange(m, a, b));
    const total = ms.reduce((s, m) => s + m.ids.length, 0);
    const active = new Set(ms.flatMap((m) => m.ids).filter((i) => known.has(i)));
    return { meetups: ms.length, total, avg: ms.length ? total / ms.length : 0, active: active.size };
  };
  const cur = period(from, today);
  const prev = hasPrev ? period(prevFrom, prevTo) : null;

  const cm = all.filter((m) => inRange(m, from, today));

  // ---- 주별 추이 ----
  const weeks: { label: string; range: string; meetups: number; total: number; current: boolean; partial: boolean }[] = [];
  const thisMonday = mondayOf(today);
  for (let s = mondayOf(from); s <= thisMonday; s = addDays(s, 7)) {
    const e = addDays(s, 6);
    const ms = cm.filter((m) => inRange(m, s, e));
    weeks.push({
      label: md(s), range: `${md(s)}~${md(e)}`, meetups: ms.length,
      total: ms.reduce((t, m) => t + m.ids.length, 0), current: s === thisMonday, partial: s < from,
    });
  }

  // ---- 요일별 평균 ----
  const wd = Array.from({ length: 7 }, () => ({ n: 0, sum: 0 }));
  for (const m of cm) { const d = dow(m.day); wd[d].n++; wd[d].sum += m.ids.length; }
  const weekdays = [1, 2, 3, 4, 5, 6, 0].map((d) => ({ d, n: wd[d].n, avg: wd[d].n ? wd[d].sum / wd[d].n : 0 }));

  // ---- 회원별 누적 (전체 수집 범위 기준) ----
  const stat = new Map<string, { n: number; last: string; inRange: number }>();
  for (const m of all) {
    for (const id of m.ids) {
      if (!known.has(id)) continue;
      const s = stat.get(id) ?? { n: 0, last: "", inRange: 0 };
      s.n++;
      if (m.day > s.last) s.last = m.day;
      if (m.day >= from) s.inRange++;
      stat.set(id, s);
    }
  }
  const buckets = { active: 0, warn: 0, lapsed: 0, none: 0 };
  const lapsing: { name: string; days: number; n: number }[] = [];
  for (const m of members) {
    const s = stat.get(m.mid);
    if (!s) { buckets.none++; continue; }
    const days = diff(today, s.last);
    if (days <= 30) buckets.active++;
    else if (days <= 90) buckets.warn++;
    else buckets.lapsed++;
    if (days > 30 && s.n >= 3) lapsing.push({ name: m.name, days, n: s.n });
  }
  lapsing.sort((a, b) => b.n - a.n || a.days - b.days);

  // ---- 순위 ----
  const topMeetups = [...cm].sort((a, b) => b.ids.length - a.ids.length || b.w_t - a.w_t).slice(0, 5)
    .map((m) => ({ title: m.title, day: m.day, count: m.ids.length }));
  const topMembers = [...stat.entries()].filter(([, s]) => s.inRange > 0)
    .map(([id, s]) => ({ name: nameOf.get(id)!, count: s.inRange }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "ko")).slice(0, 10);

  const byPlace = new Map<string, { n: number; sum: number }>();
  for (const m of cm) {
    const k = m.place || "장소 미정";
    const p = byPlace.get(k) ?? { n: 0, sum: 0 };
    p.n++; p.sum += m.ids.length;
    byPlace.set(k, p);
  }
  const places = [...byPlace.entries()].map(([place, p]) => ({ place, n: p.n, avg: p.sum / p.n }))
    .sort((a, b) => b.n - a.n || b.avg - a.avg).slice(0, 6);

  // ---- 출결 품질 ----
  const signed = cm.reduce((s, m) => s + m.signed, 0);
  const late = cm.reduce((s, m) => s + m.late.length, 0);
  const cancel = cm.reduce((s, m) => s + m.cancel.length, 0);
  const noshow = cm.reduce((s, m) => s + m.noshow.length, 0);
  const quality = { signed, normal: cur.total - late, late, cancel, noshow, marked: late + cancel + noshow };
  const bad = new Map<string, { cancel: number; noshow: number }>();
  const bump = (id: string, k: "cancel" | "noshow") => {
    const v = bad.get(id) ?? { cancel: 0, noshow: 0 };
    v[k]++;
    bad.set(id, v);
  };
  for (const m of cm) {
    m.cancel.forEach((id) => bump(id, "cancel"));
    m.noshow.forEach((id) => bump(id, "noshow"));
  }
  const offenders = [...bad.entries()]
    .map(([id, v]) => ({ name: nameOf.get(id) ?? `(미확인:${id.slice(0, 6)})`, ...v }))
    .sort((a, b) => b.cancel + b.noshow - (a.cancel + a.noshow) || b.noshow - a.noshow).slice(0, 5);

  // ---- 신규 가입 ----
  const monthKey = (d: string) => d.slice(0, 7);
  const months: string[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(today.slice(0, 7) + "-01T00:00:00Z");
    d.setUTCMonth(d.getUTCMonth() - i);
    months.push(d.toISOString().slice(0, 7));
  }
  const joinedMonthly = new Map(months.map((k) => [k, 0]));
  let recentJoined = 0;
  let recentJoinedAttended = 0;
  const recentFrom = addDays(today, -89);
  for (const m of members) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(m.joined_date ?? "") || m.is_owner) continue;
    const k = monthKey(m.joined_date);
    if (joinedMonthly.has(k)) joinedMonthly.set(k, joinedMonthly.get(k)! + 1);
    if (m.joined_date >= recentFrom) { recentJoined++; if (stat.has(m.mid)) recentJoinedAttended++; }
  }
  const joins = months.map((k) => ({ label: `${Number(k.slice(5))}월`, key: k, count: joinedMonthly.get(k)! }));

  return {
    from, today, range, hasPrev, cur, prev, weeks, weekdays, buckets, lapsing: lapsing.slice(0, 8),
    memberCount: members.length, topMeetups, topMembers, places, quality, offenders,
    joins, recentJoined, recentJoinedAttended, earliest,
  };
}

export type Dashboard = ReturnType<typeof buildDashboard>;
