import { connection } from "next/server";
import CalendarGrid from "@/components/CalendarGrid";
import MeetupFormDialog from "@/components/MeetupFormDialog";
import MeetupPanel from "@/components/MeetupPanel";
import { ModalButton } from "@/components/HeaderActions";
import { getData } from "@/lib/queries";
import { requireStaff } from "@/lib/session";
import { KST_TODAY, calHref } from "@/lib/url";
import Link from "next/link";

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function CalendarPage(props: PageProps<"/">) {
  await connection(); // "오늘" 날짜가 요청마다 다르므로 요청 시점에 렌더
  const { role } = await requireStaff();
  const sp = await props.searchParams;
  const data = await getData();
  const canEdit = role === "admin";

  const today = KST_TODAY();
  const wt = Number(one(sp.meetup)) || null;
  const selected = wt ? data.meetups.find((m) => m.w_t === wt) ?? null : null;
  const qMonth = one(sp.month);
  const month = qMonth && /^\d{4}-\d{2}$/.test(qMonth) ? qMonth : selected?.day?.slice(0, 7) ?? today.slice(0, 7);
  const modal = one(sp.modal);
  const closeHref = calHref({ month, meetup: selected?.w_t });
  const empty = data.meetups.length === 0 && data.members.length === 0;

  return (
    <>
      {empty && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-panel px-4 py-3">
          <div>
            <p className="text-sm font-medium">아직 가져온 데이터가 없어요</p>
            <p className="mt-0.5 text-xs text-muted">소모임에서 회원과 벙을 처음 한 번 가져와야 캘린더가 채워져요.</p>
          </div>
          {canEdit && <ModalButton modal="sync" variant="primary" icon="refresh">데이터 가져오기</ModalButton>}
        </div>
      )}

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
        <CalendarGrid month={month} today={today} meetups={data.meetups} selectedWt={selected?.w_t ?? null} canEdit={canEdit} />

        {selected ? (
          <>
            {/* 모바일: 하단 시트 + 배경 누르면 닫힘 */}
            <Link href={calHref({ month })} replace aria-label="닫기"
              className="fixed inset-0 z-30 bg-black/40 lg:hidden" />
            <aside className="fixed inset-x-0 bottom-0 z-40 rounded-t-xl border border-line bg-panel shadow-2xl lg:sticky lg:inset-x-auto lg:bottom-auto lg:top-[4.75rem] lg:z-auto lg:rounded-lg lg:shadow-none">
              <MeetupPanel meetup={selected} members={data.members} canEdit={canEdit} month={month}
                past={!!selected.day && selected.day < today} />
            </aside>
          </>
        ) : (
          <aside className="hidden rounded-lg border border-dashed border-line bg-panel px-6 py-16 text-center lg:sticky lg:top-[4.75rem] lg:block">
            <p className="text-sm font-medium">벙을 선택하세요</p>
            <p className="mt-1 text-xs text-muted">캘린더에서 벙을 누르면 참석자를 보고<br />인원을 추가·제거할 수 있어요.</p>
          </aside>
        )}
      </div>

      {canEdit && modal === "add" && (
        <MeetupFormDialog mode="add" closeHref={closeHref}
          defaults={{ title: "", date: one(sp.day) ?? today, place: "" }} />
      )}
      {canEdit && modal === "edit" && selected && (
        <MeetupFormDialog mode="edit" wt={selected.w_t} closeHref={closeHref}
          defaults={{ title: selected.title, date: selected.day ?? today, place: selected.place ?? "" }} />
      )}
    </>
  );
}
