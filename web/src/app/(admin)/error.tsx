"use client";

import { Button } from "@/components/ui";

export default function ErrorPage({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto max-w-md rounded-lg border border-line bg-panel p-6 text-center">
      <p className="text-sm font-semibold">화면을 불러오지 못했어요</p>
      <p className="mt-2 break-words text-xs text-muted">{error.message}</p>
      <div className="mt-4"><Button variant="primary" onClick={reset}>다시 시도</Button></div>
    </div>
  );
}
