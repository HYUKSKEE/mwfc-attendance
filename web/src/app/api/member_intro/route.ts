import { NextRequest, connection } from "next/server";
import { deny, roleOf } from "@/lib/auth";
import { lazyMemberIntro } from "@/lib/somoim/collect";

export const maxDuration = 60;

export async function GET(req: NextRequest) {
  await connection();
  const d = deny(roleOf(req));
  if (d) return d;
  const mid = req.nextUrl.searchParams.get("mid") ?? "";
  try {
    return Response.json({ ok: true, ...(mid ? await lazyMemberIntro(mid) : {}) });
  } catch (e) {
    return Response.json({ ok: false, error: String(e instanceof Error ? e.message : e) }, { status: 500 });
  }
}
