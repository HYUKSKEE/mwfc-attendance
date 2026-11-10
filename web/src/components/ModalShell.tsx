"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { Icon } from "./ui";

/** 모달 껍데기. 닫기 = 주어진 주소로 이동(replace) → 모달 상태가 URL/부모 상태에 반영됨 */
export default function ModalShell({
  title, children, closeHref, onClose, width = "max-w-md",
}: {
  title: string;
  children: ReactNode;
  closeHref?: string;
  onClose?: () => void;
  width?: string;
}) {
  const router = useRouter();
  const close = () => (onClose ? onClose() : closeHref && router.replace(closeHref));

  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4"
      onMouseDown={(e) => e.target === e.currentTarget && close()}>
      <div role="dialog" aria-modal="true" aria-label={title}
        className={`flex max-h-full w-full ${width} flex-col rounded-xl border border-line bg-panel shadow-2xl`}>
        <div className="flex shrink-0 items-center justify-between border-b border-line px-5 py-3.5">
          <h2 className="text-[15px] font-semibold">{title}</h2>
          <button onClick={close} aria-label="닫기" className="rounded p-1 text-muted hover:bg-panel2 hover:text-fg">
            <Icon name="x" />
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </div>
  );
}
