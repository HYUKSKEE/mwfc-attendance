import type { Meetup, Member, Status } from "@/lib/types";
import { calHref, fmtDay, fmtTime } from "@/lib/url";
import AttendeeEditor from "./AttendeeEditor";
import PanelActions from "./PanelActions";
import { Badge, Icon } from "./ui";
import Link from "next/link";

/** 선택한 벙 상세 (서버 컴포넌트). 인터랙션은 AttendeeEditor / PanelActions 에서만 */
export default function MeetupPanel({
  meetup, members, canEdit, month, past = false,
}: { meetup: Meetup; members: Member[]; canEdit: boolean; month: string; past?: boolean }) {
  const status: Record<string, Status> = {};
  for (const i of meetup.late_ids ?? []) status[i] = "late";
  for (const i of meetup.cancel_ids ?? []) status[i] = "cancel";
  for (const i of meetup.noshow_ids ?? []) status[i] = "noshow";
  const people = members.filter((m) => !m.banned).map((m) => ({ id: m.mid, name: m.name }));

  return (
    <div className="flex max-h-[85vh] flex-col lg:max-h-[calc(100vh-7.5rem)]">
      <header className="border-b border-line px-4 py-3.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h2 className="truncate text-[15px] font-semibold" title={meetup.title}>{meetup.title}</h2>
            <p className="mt-0.5 text-xs text-muted">
              {meetup.day ? fmtDay(meetup.day) : "날짜 없음"}
              {fmtTime(meetup.time) ? ` ${fmtTime(meetup.time)}` : ""}
              {meetup.place ? ` · ${meetup.place}` : ""}
            </p>
          </div>
          <Link href={calHref({ month })} replace aria-label="닫기"
            className="rounded p-1 text-muted hover:bg-panel2 hover:text-fg lg:hidden">
            <Icon name="x" />
          </Link>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {meetup.cancelled && <Badge tone="red">취소됨 (출석 미인정)</Badge>}
          {meetup.source === "manual" && <Badge tone="amber">수동 추가</Badge>}
          {meetup.manual && <Badge tone="amber">참석자 보정됨</Badge>}
          {meetup.edited && <Badge tone="amber">수정됨</Badge>}
          {meetup.live === false && <Badge>소모임에서 삭제됨(보관)</Badge>}
        </div>
      </header>

      {/* key: 다른 벙을 고르면 편집기 상태(검색어 등) 초기화 */}
      <AttendeeEditor key={meetup.w_t} wt={meetup.w_t} attendeeIds={meetup.attendee_ids} status={status}
        members={people} canEdit={canEdit} past={past} cancelled={!!meetup.cancelled} />

      {canEdit && <PanelActions wt={meetup.w_t} month={month} cancelled={!!meetup.cancelled} />}
    </div>
  );
}
