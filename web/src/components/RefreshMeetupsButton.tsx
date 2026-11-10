"use client";

import { useState, useTransition } from "react";
import { refreshMeetups } from "@/app/actions";
import { Button } from "./ui";

/** 소모임에서 벙 데이터를 다시 불러온다. 끝나면 서버가 화면을 자동으로 갱신 */
export default function RefreshMeetupsButton({ variant = "default" }: { variant?: "default" | "primary" }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const run = () =>
    start(async () => {
      setMsg(null);
      const r = await refreshMeetups();
      setMsg({ ok: r.ok, text: r.ok ? r.message ?? "완료" : r.error ?? "실패했어요" });
    });

  return (
    <div className="flex flex-col items-center gap-2">
      <Button icon="refresh" variant={variant} onClick={run} disabled={pending}>
        {pending ? "불러오는 중… (잠시 걸려요)" : "벙 데이터 불러오기"}
      </Button>
      {msg && (
        <p role={msg.ok ? "status" : "alert"} className={`text-xs ${msg.ok ? "text-muted" : "text-danger"}`}>{msg.text}</p>
      )}
    </div>
  );
}
