import { Suspense, type ReactNode } from "react";
import { connection } from "next/server";
import { HeaderButtons, HeaderDialogs } from "@/components/HeaderActions";
import InstallBanner from "@/components/InstallBanner";
import { MobileTabs, Sidebar } from "@/components/Sidebar";
import { getData } from "@/lib/queries";
import { requireSession } from "@/lib/session";
import { KST_TODAY } from "@/lib/url";

// 소모임 수집(서버 액션)이 오래 걸릴 수 있다
export const maxDuration = 300;

async function AdminShell({ children }: { children: ReactNode }) {
  await connection(); // 로그인 상태·오늘 날짜는 요청마다 다르므로 요청 시점에 렌더
  const session = await requireSession(); // 로그인 안 했으면 /login
  const data = await getData();
  const canEdit = session.role === "admin";

  return (
    <div className="flex min-h-screen">
      <Sidebar groupName={data.group.name} canEdit={canEdit} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 border-b border-line bg-panel/90 backdrop-blur">
          <div className="flex items-center justify-between gap-3 px-4 py-3 lg:px-6">
            <span className="text-xs text-muted">마지막 수집 {data.generated || "—"}</span>
            <HeaderButtons canEdit={canEdit} />
          </div>
          <MobileTabs />
        </header>
        <main className="flex-1 p-4 lg:p-6">
          <InstallBanner />
          {children}
        </main>
      </div>
      <HeaderDialogs
        canEdit={canEdit}
        generated={data.generated}
        today={KST_TODAY()}
        days={data.meetups.filter((m) => !m.cancelled && m.day).map((m) => m.day!)}
        memberCount={data.members.filter((m) => !m.banned).length}
      />
    </div>
  );
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center text-sm text-muted">불러오는 중…</div>}>
      <AdminShell>{children}</AdminShell>
    </Suspense>
  );
}
