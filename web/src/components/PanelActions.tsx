"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { removeMeetup, setCancelled } from "@/app/actions";
import { calHref } from "@/lib/url";
import { Button, LinkButton } from "./ui";

export default function PanelActions({
  wt, month, cancelled,
}: { wt: number; month: string; cancelled: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [err, setErr] = useState("");

  const toggle = () =>
    start(async () => {
      setErr("");
      const r = await setCancelled(wt, !cancelled);
      if (!r.ok) setErr(r.error ?? "실패했어요");
    });

  const del = () => {
    if (!window.confirm("이 벙을 삭제할까요?\n삭제하면 목록과 출석 집계에서 사라져요.")) return;
    start(async () => {
      setErr("");
      const r = await removeMeetup(wt);
      if (r.ok) router.replace(calHref({ month }));
      else setErr(r.error ?? "실패했어요");
    });
  };

  return (
    <footer className="border-t border-line px-4 py-3">
      {err && <p className="mb-2 text-xs text-danger" role="alert">{err}</p>}
      <div className="flex flex-wrap gap-2">
        <LinkButton size="sm" icon="edit" href={calHref({ month, meetup: wt, modal: "edit" })} prefetch={false}>수정</LinkButton>
        <Button size="sm" icon="ban" onClick={toggle} disabled={pending}>{cancelled ? "취소 해제" : "벙 취소"}</Button>
        <Button size="sm" variant="danger" icon="trash" onClick={del} disabled={pending} className="ml-auto">삭제</Button>
      </div>
    </footer>
  );
}
