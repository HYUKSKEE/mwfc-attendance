import { Suspense, type ReactNode } from "react";
import { connection } from "next/server";
import Link from "next/link";
import { logout } from "@/app/actions";
import InstallBanner from "@/components/InstallBanner";
import { Icon } from "@/components/ui";
import { requireSession } from "@/lib/session";

// 페이서(당일 출석 체크) 전용 화면 묶음. 사이드바 없이 한 줄 헤더만 둔다.
async function PacerShell({ children }: { children: ReactNode }) {
  await connection();
  const { role } = await requireSession();
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col">
      <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-line bg-panel/90 px-4 py-3 backdrop-blur">
        <div className="flex min-w-0 items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-m.png" alt="MWRC" width={28} height={28} className="h-7 w-7 rounded-md" />
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold">MWRC 출석부</div>
            <div className="text-[11px] text-muted">{role === "pacer" ? "페이서" : role === "admin" ? "운영진" : "보기 전용"}</div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {role !== "pacer" && (
            <Link href="/" className="rounded-md px-2.5 py-1.5 text-xs text-muted hover:bg-panel2 hover:text-fg">관리 화면</Link>
          )}
          <form action={logout}>
            <button aria-label="로그아웃" title="로그아웃" className="rounded-md p-2 text-muted hover:bg-panel2 hover:text-fg">
              <Icon name="logout" size={16} />
            </button>
          </form>
        </div>
      </header>
      <main className="flex-1 p-4">
        <InstallBanner />
        {children}
      </main>
    </div>
  );
}

export default function PacerLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center text-sm text-muted">불러오는 중…</div>}>
      <PacerShell>{children}</PacerShell>
    </Suspense>
  );
}
