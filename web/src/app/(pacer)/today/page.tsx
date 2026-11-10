import Link from "next/link";
import { connection } from "next/server";
import AttendeeEditor from "@/components/AttendeeEditor";
import { Badge } from "@/components/ui";
import { getData } from "@/lib/queries";
import { requireSession } from "@/lib/session";
import type { Status } from "@/lib/types";
import { KST_TODAY, fmtDay } from "@/lib/url";

export const metadata = { title: "오늘 벙" };

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/** 페이서용: 오늘 열리는 벙만 보여주고, 벙을 눌러 참석자를 체크한다 */
export default async function TodayPage(props: PageProps<"/today">) {
  await connection(); // '오늘'은 요청마다 다르다
  const { role } = await requireSession();
  const sp = await props.searchParams;
  const data = await getData();
  const canEdit = role === "admin" || role === "pacer";

  const today = KST_TODAY();
  const list = data.meetups.filter((m) => m.day === today).sort((a, b) => a.w_t - b.w_t);
  const wt = Number(one(sp.meetup)) || null;
  // 오늘 벙이 하나뿐이면 자동 선택
  const selected = list.find((m) => m.w_t === wt) ?? (list.length === 1 ? list[0] : null);

  const status: Record<string, Status> = {};
  for (const i of selected?.late_ids ?? []) status[i] = "late";
  for (const i of selected?.cancel_ids ?? []) status[i] = "cancel";
  for (const i of selected?.noshow_ids ?? []) status[i] = "noshow";
  const people = data.members.filter((m) => !m.banned).map((m) => ({ id: m.mid, name: m.name }));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold">오늘 벙</h1>
        <p className="mt-0.5 text-xs text-muted">{fmtDay(today)} · {list.length}개</p>
      </div>

      {list.length === 0 ? (
        <div className="rounded-lg border border-line bg-panel px-4 py-12 text-center">
          <p className="text-sm font-medium">오늘 예정된 벙이 없어요</p>
          <p className="mt-1 text-xs text-muted">벙이 보이지 않으면 운영진에게 데이터 가져오기를 요청해 주세요.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {list.map((m) => {
            const on = selected?.w_t === m.w_t;
            return (
              <li key={m.w_t}>
                <Link href={`/today?meetup=${m.w_t}`} replace prefetch={false} aria-current={on ? "true" : undefined}
                  className={`flex items-center justify-between gap-3 rounded-lg border px-4 py-3 transition ${
                    on ? "border-accent bg-accent-soft" : "border-line bg-panel hover:bg-panel2"}`}>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">{m.title}</span>
                    <span className="mt-0.5 block truncate text-xs text-muted">{m.place || "장소 미정"}</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    {m.cancelled && <Badge tone="red">취소됨</Badge>}
                    <span className="text-sm tabular-nums"><b>{m.count ?? 0}</b><span className="text-muted">명</span></span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {selected && (
        <section className="overflow-hidden rounded-lg border border-line bg-panel">
          <header className="border-b border-line px-4 py-3">
            <h2 className="truncate text-[15px] font-semibold">{selected.title}</h2>
            <p className="mt-0.5 text-xs text-muted">
              {fmtDay(today)}{selected.place ? ` · ${selected.place}` : ""}
            </p>
            {selected.cancelled && <p className="mt-2 text-xs text-danger">취소된 벙이라 수정할 수 없어요.</p>}
          </header>
          {/* key: 다른 벙을 고르면 편집기 상태 초기화 */}
          <AttendeeEditor key={selected.w_t} wt={selected.w_t} attendeeIds={selected.attendee_ids} status={status}
            members={people} canEdit={canEdit && !selected.cancelled} />
        </section>
      )}
    </div>
  );
}
