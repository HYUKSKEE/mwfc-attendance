/** 캘린더 화면 URL: 월/선택한 벙/모달 상태를 전부 주소에 담는다(공유·뒤로가기 가능) */
export function calHref(p: {
  month?: string;
  meetup?: number | string | null;
  modal?: string;
  day?: string;
}): string {
  const q = new URLSearchParams();
  if (p.month) q.set("month", p.month);
  if (p.meetup) q.set("meetup", String(p.meetup));
  if (p.modal) q.set("modal", p.modal);
  if (p.day) q.set("day", p.day);
  const s = q.toString();
  return s ? `/?${s}` : "/";
}

export const KST_TODAY = () => new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
export const WEEK = ["일", "월", "화", "수", "목", "금", "토"];

export function addMonths(ym: string, n: number): string {
  const [y, m] = ym.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1 + n, 1)).toISOString().slice(0, 7);
}

export function addDays(day: string, n: number): string {
  const d = new Date(day + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** 해당 월을 덮는 일~토 주 단위 날짜 격자 */
export function monthGrid(ym: string): string[] {
  const first = `${ym}-01`;
  const dow = new Date(first + "T00:00:00Z").getUTCDay();
  const [y, m] = ym.split("-").map(Number);
  const dim = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const weeks = Math.ceil((dow + dim) / 7);
  return Array.from({ length: weeks * 7 }, (_, i) => addDays(first, i - dow));
}

export function fmtDay(day: string): string {
  const d = new Date(day + "T00:00:00Z");
  return `${Number(day.slice(5, 7))}월 ${Number(day.slice(8, 10))}일 (${WEEK[d.getUTCDay()]})`;
}
