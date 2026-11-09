import { createHmac, timingSafeEqual } from "node:crypto";
import { getConfig } from "./config";

// 서버리스라 메모리 토큰을 못 쓰므로 HMAC 서명 토큰(role.만료.서명)을 쓴다.
export type Role = "admin" | "user";
const TTL_SEC = 60 * 60 * 24 * 30;

function secret() {
  const e = process.env;
  return (
    e.AUTH_SECRET ||
    `${e.SOMOIM_PW ?? ""}|${e.ADMIN_PASSWORD ?? ""}|${e.WEB_PASSWORD ?? ""}|att`
  );
}

function sign(payload: string) {
  return createHmac("sha256", secret()).update(payload).digest("hex");
}

/** 비밀번호가 하나도 없을 때: 로컬은 잠금 없이 관리자, 배포 환경은 전부 차단. */
export function lockState(): "open" | "locked" | "misconfigured" {
  const c = getConfig();
  if (c.adminPassword || c.webPassword) return "locked";
  return process.env.VERCEL ? "misconfigured" : "open";
}

export function checkLogin(pw: string): Role | null {
  const c = getConfig();
  if (lockState() === "open") return "admin";
  if (c.adminPassword && pw === c.adminPassword) return "admin";
  if (c.webPassword && pw === c.webPassword) return "user";
  return null;
}

export function issueToken(role: Role): string {
  const exp = Math.floor(Date.now() / 1000) + TTL_SEC;
  const payload = `${role}.${exp}`;
  return `${payload}.${sign(payload)}`;
}

export function verifyToken(token: string | null | undefined): Role | null {
  if (!token) return null;
  const [role, exp, sig] = token.split(".");
  if ((role !== "admin" && role !== "user") || !exp || !sig) return null;
  if (Number(exp) < Date.now() / 1000) return null;
  const expect = sign(`${role}.${exp}`);
  const a = Buffer.from(sig);
  const b = Buffer.from(expect);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return role;
}

/** 요청에서 역할 확인: x-att-token 헤더 → ?token= → (POST) body.token */
export function roleOf(req: Request, bodyToken?: string): Role | null {
  if (lockState() === "open") return "admin";
  if (lockState() === "misconfigured") return null;
  const url = new URL(req.url);
  const token =
    req.headers.get("x-att-token") ||
    url.searchParams.get("token") ||
    bodyToken ||
    "";
  return verifyToken(token);
}

export function deny(role: Role | null, need: Role = "user") {
  if (!role) {
    return Response.json({ ok: false, error: "인증 필요" }, { status: 403 });
  }
  if (need === "admin" && role !== "admin") {
    return Response.json({ ok: false, error: "관리자만 가능" }, { status: 403 });
  }
  return null;
}
