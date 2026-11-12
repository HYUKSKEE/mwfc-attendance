import Link from "next/link";
import type { Meetup } from "@/lib/types";
import { WEEK, addMonths, calHref, fmtTime, fmtTimeShort, monthGrid } from "@/lib/url";
import { Icon, LinkButton } from "./ui";

const MAX_CHIPS = 3;

/** 월간 캘린더 (서버 컴포넌트). 모든 이동·선택이 <Link> 라서 클라이언트 JS 없이 동작 */
export default function CalendarGrid({
  month, today, meetups, selectedWt, canEdit,
}: { month: string; today: string; meetups: Meetup[]; selectedWt: number | null; canEdit: boolean }) {
  const grid = monthGrid(month);
  const byDay = new Map<string, Meetup[]>();
  for (const m of meetups) {
    if (!m.day) continue;
    const l = byDay.get(m.day) ?? [];
    l.push(m);
    byDay.set(m.day, l);
  }
  for (const l of byDay.values()) l.sort((a, b) => (a.time ?? 9999) - (b.time ?? 9999) || a.w_t - b.w_t);

  const monthCount = meetups.filter((m) => m.day?.startsWith(month) && !m.cancelled).length;
  const [y, mo] = month.split("-");
  const keep = selectedWt ?? undefined;

  return (
    <section className="rounded-lg border border-line bg-panel">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
        <div className="flex items-center gap-3">
          <h2 className="text-base font-semibold">{y}년 {Number(mo)}월</h2>
          <span className="text-xs text-muted">벙 {monthCount}개</span>
        </div>
        <div className="flex items-center gap-1.5">
          <LinkButton size="sm" href={calHref({ month: addMonths(month, -1), meetup: keep })} title="이전 달"><Icon name="left" size={14} /></LinkButton>
          <LinkButton size="sm" href={calHref({})}>오늘</LinkButton>
          <LinkButton size="sm" href={calHref({ month: addMonths(month, 1), meetup: keep })} title="다음 달"><Icon name="right" size={14} /></LinkButton>
        </div>
      </header>

      <div className="grid grid-cols-7 border-b border-line bg-panel2 text-center text-xs font-medium text-muted">
        {WEEK.map((w, i) => (
          <div key={w} className={`py-2 ${i === 0 ? "text-danger" : i === 6 ? "text-accent" : ""}`}>{w}</div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {grid.map((day, i) => {
          const inMonth = day.startsWith(month);
          const list = byDay.get(day) ?? [];
          return (
            <div key={day}
              className={`group relative min-h-[88px] border-b border-r border-line p-1.5 sm:min-h-[112px] ${
                i % 7 === 6 ? "border-r-0" : ""} ${inMonth ? "" : "bg-panel2/60"}`}>
              <div className="mb-1 flex items-center justify-between">
                <span className={`inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-xs ${
                  day === today ? "bg-accent font-semibold text-accent-fg"
                    : inMonth ? (i % 7 === 0 ? "text-danger" : "text-fg") : "text-muted/60"}`}>
                  {Number(day.slice(8))}
                </span>
                {canEdit && (
                  <Link href={calHref({ month, meetup: keep, modal: "add", day })} prefetch={false} title="벙 추가" aria-label={`${day} 벙 추가`}
                    className="rounded p-0.5 text-muted opacity-0 transition hover:bg-panel2 hover:text-fg focus-visible:opacity-100 group-hover:opacity-100">
                    <Icon name="plus" size={14} />
                  </Link>
                )}
              </div>
              <div className="space-y-1">
                {list.slice(0, MAX_CHIPS).map((m) => {
                  const sel = m.w_t === selectedWt;
                  return (
                    <Link key={m.w_t} href={calHref({ month, meetup: m.w_t })} prefetch={false}
                      title={`${fmtTime(m.time) ? fmtTime(m.time) + " " : ""}${m.title}`}
                      aria-current={sel ? "true" : undefined}
                      className={`flex items-center justify-between gap-1 rounded px-1.5 py-1 text-[11px] leading-tight transition ${
                        sel ? "bg-accent text-accent-fg"
                          : m.cancelled ? "bg-panel2 text-muted line-through hover:bg-line"
                          : "bg-accent-soft text-accent hover:brightness-95"}`}>
                      <span className="truncate">
                        {fmtTimeShort(m.time) && <b className="mr-1 hidden font-semibold tabular-nums sm:inline">{fmtTimeShort(m.time)}</b>}
                        {m.title}
                      </span>
                      <span className={`shrink-0 rounded-full px-1.5 text-[10px] font-semibold ${sel ? "bg-white/25" : "bg-panel/70"}`}>
                        {m.count ?? m.attendee_ids.length}
                      </span>
                    </Link>
                  );
                })}
                {list.length > MAX_CHIPS && (
                  <Link href={calHref({ month, meetup: list[MAX_CHIPS].w_t })} prefetch={false}
                    className="block px-1 text-[11px] text-muted hover:text-fg">+{list.length - MAX_CHIPS}개 더</Link>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
