"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/app/actions";
import { Icon, type IconName } from "./ui";

const NAV: Array<{ href: string; label: string; icon: IconName }> = [
  { href: "/", label: "캘린더", icon: "calendar" },
  { href: "/today", label: "오늘 벙", icon: "check" },
  { href: "/members", label: "회원", icon: "users" },
];

const isActive = (path: string, href: string) => (href === "/" ? path === "/" : path.startsWith(href));

/** 데스크톱: 좌측 사이드바 / 모바일: 상단 탭 (현재 경로 강조만 클라이언트에서 처리) */
export function Sidebar({ groupName, canEdit }: { groupName: string; canEdit: boolean }) {
  const path = usePathname();
  return (
    <aside className="sticky top-0 hidden h-screen w-56 shrink-0 flex-col bg-side text-side-fg md:flex">
      <div className="px-5 pb-5 pt-6">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-m.png" alt="MWRC" width={36} height={36} className="mb-3 h-9 w-9 rounded-lg" />
        <div className="text-[15px] font-semibold text-white">MWRC 출석부</div>
        <div className="mt-0.5 truncate text-xs" title={groupName}>{groupName || "소모임"}</div>
      </div>
      <nav className="flex-1 space-y-0.5 px-3">
        {NAV.map((n) => (
          <Link key={n.href} href={n.href}
            className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition ${
              isActive(path, n.href) ? "bg-side-active font-medium text-white" : "hover:bg-side-active/60 hover:text-white"}`}>
            <Icon name={n.icon} />{n.label}
          </Link>
        ))}
      </nav>
      <form action={logout} className="border-t border-white/10 p-3">
        <div className="mb-1 px-3 text-[11px]">{canEdit ? "관리자" : "보기 전용"}</div>
        <button className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm hover:bg-side-active/60 hover:text-white">
          <Icon name="logout" />로그아웃
        </button>
      </form>
    </aside>
  );
}

export function MobileTabs() {
  const path = usePathname();
  return (
    <div className="flex gap-1 border-t border-line px-3 py-1.5 md:hidden">
      {NAV.map((n) => (
        <Link key={n.href} href={n.href}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 text-sm ${
            isActive(path, n.href) ? "bg-accent-soft font-medium text-accent" : "text-muted"}`}>
          <Icon name={n.icon} size={14} />{n.label}
        </Link>
      ))}
      <form action={logout}>
        <button aria-label="로그아웃" className="rounded-md px-3 py-1.5 text-muted"><Icon name="logout" size={14} /></button>
      </form>
    </div>
  );
}
