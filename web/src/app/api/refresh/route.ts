import { NextRequest, connection } from "next/server";
import { deny, roleOf } from "@/lib/auth";
import { collectData } from "@/lib/somoim/collect";
import { acquireLock, releaseLock } from "@/lib/store";

// 수집은 수십 초~수 분 걸릴 수 있다(기간이 길수록).
export const maxDuration = 300;

export async function GET(req: NextRequest) {
  await connection();
  const d = deny(roleOf(req));
  if (d) return d;
  const raw = (req.nextUrl.searchParams.get("months") ?? "12").toLowerCase();
  const months = raw === "all" ? null : Math.max(1, Math.min(120, Number(raw) || 12));
  if (!(await acquireLock("collect", maxDuration + 30))) {
    return Response.json({ ok: false, error: "이미 수집이 진행 중이에요. 잠시 후 다시 시도하세요." }, { status: 409 });
  }
  try {
    const r = await collectData(months);
    return Response.json({ ok: true, months: raw, ...r });
  } catch (e) {
    return Response.json({ ok: false, error: String(e instanceof Error ? e.message : e) }, { status: 500 });
  } finally {
    await releaseLock("collect");
  }
}
