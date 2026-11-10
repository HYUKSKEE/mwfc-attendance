import { Suspense } from "react";
import { redirect } from "next/navigation";
import LoginForm from "@/components/LoginForm";
import { lockState } from "@/lib/auth";
import { getSession } from "@/lib/session";

export const metadata = { title: "로그인" };

async function LoginCard() {
  const s = await getSession();
  if (s) redirect(s.role === "pacer" ? "/today" : "/");
  const misconfigured = lockState() === "misconfigured";
  return (
    <div className="w-full max-w-sm rounded-xl border border-line bg-panel p-7 shadow-sm">
      <div className="mb-5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-m.png" alt="MWRC" width={44} height={44} className="mb-3 h-11 w-11 rounded-lg" />
        <h1 className="text-lg font-semibold">MWRC 출석부</h1>
        <p className="mt-1 text-xs text-muted">운영진 전용 페이지예요. 비밀번호를 입력하세요.</p>
      </div>
      {misconfigured ? (
        <p className="rounded-md bg-warn-soft px-3 py-2 text-xs text-warn">
          서버에 ADMIN_PASSWORD(또는 WEB_PASSWORD) 환경변수가 없어서 잠겨 있어요. 설정 후 다시 배포해 주세요.
        </p>
      ) : (
        <LoginForm />
      )}
    </div>
  );
}

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <Suspense fallback={<div className="h-64 w-full max-w-sm animate-pulse rounded-xl bg-panel" />}>
        <LoginCard />
      </Suspense>
    </main>
  );
}
