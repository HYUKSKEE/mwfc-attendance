"use client";

import { useState, useTransition } from "react";
import { runCollect, type ActionResult } from "@/app/actions";
import { Button } from "./ui";
import ModalShell from "./ModalShell";

const PRESETS = [30, 60, 90, 120, 180];

export default function SyncDialog({ generated, onClose }: { generated: string; onClose: () => void }) {
  const [days, setDays] = useState(180);
  const [res, setRes] = useState<ActionResult | null>(null);
  const [pending, start] = useTransition();

  const run = () =>
    start(async () => {
      setRes(null);
      setRes(await runCollect(days));
    });

  return (
    <ModalShell title="소모임에서 데이터 가져오기" onClose={pending ? () => {} : onClose}>
      <p className="text-xs text-muted">
        마지막 수집: {generated || "아직 없음"}. 매일 자동으로도 수집돼요(최근 180일). 수정·삭제·참석자 보정은 수집해도 그대로 유지됩니다.
      </p>
      <div className="mt-4 rounded-lg border border-line bg-panel2 p-4">
        <div className="flex items-baseline justify-between">
          <span className="text-xs text-muted">수집 기간</span>
          <span className="text-2xl font-semibold tabular-nums">최근 {days}<span className="ml-0.5 text-sm font-normal text-muted">일</span></span>
        </div>
        <input type="range" min={30} max={180} step={1} value={days} disabled={pending} aria-label="수집 기간(일)"
          onChange={(e) => setDays(Number(e.target.value))} className="mt-2 w-full" />
        <div className="mt-1 flex justify-between text-[11px] text-muted"><span>30일</span><span>180일</span></div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {PRESETS.map((p) => (
            <button key={p} onClick={() => setDays(p)} disabled={pending}
              className={`rounded-full border px-2.5 py-1 text-xs ${days === p ? "border-accent bg-accent-soft text-accent" : "border-line bg-panel text-muted hover:text-fg"}`}>
              {p}일
            </button>
          ))}
        </div>
      </div>
      {pending && <p className="mt-3 text-xs text-muted">수집 중이에요. 최대 1~2분 걸릴 수 있으니 창을 닫지 마세요…</p>}
      {res && <p className={`mt-3 break-words text-xs ${res.ok ? "text-ok" : "text-danger"}`}>{res.ok ? res.message : res.error}</p>}
      <div className="mt-5 flex justify-end gap-2">
        <Button onClick={onClose} disabled={pending}>닫기</Button>
        <Button variant="primary" icon="refresh" onClick={run} disabled={pending}>{pending ? "수집 중…" : "수집 시작"}</Button>
      </div>
    </ModalShell>
  );
}
