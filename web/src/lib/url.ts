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

/** 2030 → "오후 8:30", 1130 → "오전 11:30" (없으면 빈 문자열) */
export function fmtTime(t: number | null | undefined): string {
  if (t == null || !Number.isFinite(t)) return "";
  const h = Math.floor(t / 100);
  const m = t % 100;
  if (h < 0 || h > 23 || m < 0 || m > 59) return "";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h < 12 ? "오전" : "오후"} ${h12}:${String(m).padStart(2, "0")}`;
}

/** 2030 → "20:30" (캘린더 칩처럼 좁은 곳용) */
export function fmtTimeShort(t: number | null | undefined): string {
  if (t == null || !Number.isFinite(t)) return "";
  const h = Math.floor(t / 100);
  const m = t % 100;
  if (h < 0 || h > 23 || m < 0 || m > 59) return "";
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function fmtDay(day: string): string {
  const d = new Date(day + "T00:00:00Z");
  return `${Number(day.slice(5, 7))}월 ${Number(day.slice(8, 10))}일 (${WEEK[d.getUTCDay()]})`;
}

/** 벙 시작 시각(epoch ms, KST). 시간 정보(HHMM)가 없으면 그날 0시 */
export function meetupStartMs(day: string, time?: number | null): number {
  const hh = time != null ? String(Math.floor(time / 100)).padStart(2, "0") : "00";
  const mm = time != null ? String(time % 100).padStart(2, "0") : "00";
  return Date.parse(`${day}T${hh}:${mm}:00+09:00`);
}

/**
 * 소모임에서 삭제된 벙이 '시작 전에 삭제'로 볼 만한가.
 * 삭제 감지 시각(gone_at)이 시작보다 이르거나, 기록이 없으면(이전에 사라진 벙) 시작 전으로 본다.
 */
export function deletedBeforeStart(m: { live?: boolean; gone_at?: number | null; day?: string; time?: number | null }): boolean {
  if (m.live !== false) return false;
  if (!m.gone_at || !m.day) return true;
  return m.gone_at < meetupStartMs(m.day, m.time);
}
