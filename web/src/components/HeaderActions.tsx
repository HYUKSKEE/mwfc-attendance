"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "./ui";
import SheetDialog from "./SheetDialog";
import SyncDialog from "./SyncDialog";

/** 어느 화면에서든 쓰는 도구(출석표/수집). 열림 상태는 ?modal= 에 두어 현재 화면 상태를 유지 */
export function useModalHref() {
  const path = usePathname();
  const sp = useSearchParams();
  return (modal: string | null) => {
    const q = new URLSearchParams(sp.toString());
    if (modal) q.set("modal", modal);
    else q.delete("modal");
    const s = q.toString();
    return s ? `${path}?${s}` : path;
  };
}

export function ModalButton({ modal, ...rest }: { modal: "sync" | "sheet" } & Omit<React.ComponentProps<typeof Button>, "onClick">) {
  const router = useRouter();
  const href = useModalHref();
  return <Button {...rest} onClick={() => router.replace(href(modal))} />;
}

/** 상단바 버튼 */
export function HeaderButtons({ canEdit }: { canEdit: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <ModalButton modal="sync" size="sm" icon="refresh" disabled={!canEdit}>
        <span className="hidden sm:inline">데이터 가져오기</span><span className="sm:hidden">수집</span>
      </ModalButton>
      <ModalButton modal="sheet" size="sm" variant="primary" icon="download">출석표 뽑기</ModalButton>
    </div>
  );
}

/**
 * 모달. 반드시 상단바(backdrop-blur) 밖에 둔다:
 * backdrop-filter 가 걸린 요소 안의 position:fixed 는 화면이 아니라 그 요소를 기준으로 배치되기 때문.
 */
export function HeaderDialogs({
  canEdit, generated, days, memberCount, today,
}: { canEdit: boolean; generated: string; days: string[]; memberCount: number; today: string }) {
  const router = useRouter();
  const modal = useSearchParams().get("modal");
  const href = useModalHref();
  const close = () => router.replace(href(null));

  return (
    <>
      {modal === "sheet" && <SheetDialog days={days} memberCount={memberCount} today={today} onClose={close} />}
      {modal === "sync" && canEdit && <SyncDialog generated={generated} onClose={close} />}
    </>
  );
}
