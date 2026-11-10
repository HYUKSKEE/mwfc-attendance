import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { lockState, verifyToken, type Role } from "./auth";

// 세션 = httpOnly 쿠키에 담긴 서명 토큰. 서버 컴포넌트/서버 액션에서만 읽는다.
export const SESSION_COOKIE = "att_token";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30;

export const getSession = cache(async (): Promise<{ role: Role } | null> => {
  const state = lockState();
  if (state === "open") return { role: "admin" }; // 로컬 개발: 비밀번호 미설정
  if (state === "misconfigured") return null;
  const role = verifyToken((await cookies()).get(SESSION_COOKIE)?.value);
  return role ? { role } : null;
});

/** 로그인 안 했으면 /login 으로 */
export async function requireSession() {
  const s = await getSession();
  if (!s) redirect("/login");
  return s;
}

/** 서버 액션용: 문제 있으면 에러 문구, 통과하면 null */
export async function adminError(): Promise<string | null> {
  const s = await getSession();
  if (!s) return "로그인이 필요해요. 다시 로그인해 주세요.";
  if (s.role !== "admin") return "관리자만 할 수 있어요.";
  return null;
}
