"use client";

import { useMemo, useState } from "react";
import { addDays } from "@/lib/url";
import { Button, btnCls } from "./ui";
import ModalShell from "./ModalShell";

const PRESETS = [30, 60, 90, 120, 180];

export default function SheetDialog({
  days: meetupDays, memberCount, today, onClose,
}: { days: string[]; memberCount: number; today: string; onClose: () => void }) {
  const [days, setDays] = useState(30);
  const [absent, setAbsent] = useState(true);

  const to = today; // 서버가 요청 시점에 계산해 전달
  const from = addDays(to, -(days - 1));
  const count = useMemo(() => meetupDays.filter((d) => d >= from && d <= to).length, [meetupDays, from, to]);
  const url = `/api/export_xlsx?mode=sheet&days=${days}&absent=${absent ? 1 : 0}`;

  return (
    <ModalShell title="출석표 뽑기" onClose={onClose}>
      <p className="text-xs text-muted">최근 며칠치 벙을 가로(날짜), 회원을 세로로 한 엑셀 출석표를 만들어요.</p>

      <div className="mt-4 rounded-lg border border-line bg-panel2 p-4">
        <div className="flex items-baseline justify-between">
          <span className="text-xs text-muted">기간</span>
          <span className="text-2xl font-semibold tabular-nums">{days}<span className="ml-0.5 text-sm font-normal text-muted">일</span></span>
        </div>
        <input type="range" min={7} max={180} step={1} value={days} aria-label="출석표 기간(일)"
          onChange={(e) => setDays(Number(e.target.value))} className="mt-2 w-full" />
        <div className="mt-1 flex justify-between text-[11px] text-muted"><span>7일</span><span>180일</span></div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {PRESETS.map((p) => (
            <button key={p} onClick={() => setDays(p)}
              className={`rounded-full border px-2.5 py-1 text-xs ${days === p ? "border-accent bg-accent-soft text-accent" : "border-line bg-panel text-muted hover:text-fg"}`}>
              {p}일
            </button>
          ))}
        </div>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-md border border-line p-3">
          <dt className="text-xs text-muted">기간</dt>
          <dd className="mt-0.5 whitespace-nowrap text-[12px] font-medium tabular-nums">{from} ~ {to}</dd>
        </div>
        <div className="rounded-md border border-line p-3">
          <dt className="text-xs text-muted">포함되는 벙</dt>
          <dd className="mt-0.5 text-[13px] font-medium">{count}개 <span className="text-muted">· 회원 {memberCount}명</span></dd>
        </div>
      </dl>

      <label className="mt-4 flex items-center gap-2 text-sm">
        <input type="checkbox" checked={absent} onChange={(e) => setAbsent(e.target.checked)} />
        기간 내 한 번도 안 나온 회원도 포함
      </label>

      {count === 0 && <p className="mt-3 rounded-md bg-warn-soft px-3 py-2 text-xs text-warn">이 기간에 벙이 없어요. 기간을 늘려 보세요.</p>}

      <div className="mt-5 flex justify-end gap-2">
        <Button onClick={onClose}>닫기</Button>
        {/* 쿠키 인증이라 그냥 링크로 다운로드 */}
        {count === 0 ? (
          <Button variant="primary" icon="download" disabled>엑셀 다운로드</Button>
        ) : (
          <a href={url} download className={btnCls({ variant: "primary" })}>엑셀 다운로드</a>
        )}
      </div>
    </ModalShell>
  );
}
