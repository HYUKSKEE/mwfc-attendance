"use client";

import Link from "next/link";
import { useActionState } from "react";
import { saveMeetup, type ActionResult } from "@/app/actions";
import { Button, Field, inputCls } from "./ui";
import ModalShell from "./ModalShell";

/** 벙 추가/수정. <form action> + useActionState 로 서버 액션 직접 호출 */
export default function MeetupFormDialog({
  mode, wt, defaults, closeHref,
}: {
  mode: "add" | "edit";
  wt?: number;
  defaults: { title: string; date: string; place: string };
  closeHref: string;
}) {
  const [state, action, pending] = useActionState<ActionResult, FormData>(saveMeetup, { ok: false });

  return (
    <ModalShell title={mode === "add" ? "벙 추가" : "벙 수정"} closeHref={closeHref}>
      <form action={action} className="space-y-3">
        <input type="hidden" name="mode" value={mode} />
        {wt !== undefined && <input type="hidden" name="wt" value={wt} />}
        <Field label="벙 이름">
          <input name="title" className={inputCls} defaultValue={defaults.title} autoFocus required placeholder="예: 화요일 정기벙" />
        </Field>
        <Field label="날짜">
          <input name="date" type="date" className={inputCls} defaultValue={defaults.date} required />
        </Field>
        <Field label="장소 (선택)">
          <input name="place" className={inputCls} defaultValue={defaults.place} placeholder="예: 이촌한강 조형물앞" />
        </Field>
        {state.error && <p className="text-xs text-danger">{state.error}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <Link href={closeHref} replace className="inline-flex h-9 items-center rounded-md border border-line bg-panel px-3.5 text-sm hover:bg-panel2">취소</Link>
          <Button type="submit" variant="primary" disabled={pending}>{pending ? "저장 중…" : "저장"}</Button>
        </div>
      </form>
    </ModalShell>
  );
}
