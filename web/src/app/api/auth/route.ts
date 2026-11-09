import { NextRequest } from "next/server";
import { checkLogin, issueToken } from "@/lib/auth";
import { aiEnabled } from "@/lib/ai";

export async function GET(req: NextRequest) {
  const role = checkLogin(req.nextUrl.searchParams.get("pw") ?? "");
  if (!role) return Response.json({ ok: false });
  return Response.json({ ok: true, role, token: issueToken(role), ai: aiEnabled() });
}
