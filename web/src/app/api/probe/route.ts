import { NextRequest } from "next/server";
import { credFromEnv, syncGi } from "@/lib/somoim/client";

// 1단계 검증용: Vercel 에서 소모임 API 가 닿는지 확인하는 임시 엔드포인트.
// 회원 데이터는 내보내지 않고 상태 요약만 반환한다. 검증 후 삭제할 것.
export const maxDuration = 30;

export async function GET(req: NextRequest) {
  const secret = process.env.PROBE_SECRET;
  if (!secret || req.nextUrl.searchParams.get("key") !== secret) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const cred = credFromEnv();
  const started = Date.now();
  try {
    const { status, data } = await syncGi(cred);
    const members = Array.isArray(data.m) ? data.m : [];
    return Response.json({
      ok: data.res === 100,
      httpStatus: status,
      res: data.res ?? null, // 100=정상, 803=계정 확인 불가
      memberCount: members.length,
      serverGmc: data.g?.gmc ?? null,
      elapsedMs: Date.now() - started,
      region: process.env.VERCEL_REGION ?? "local",
    });
  } catch (e) {
    return Response.json(
      {
        ok: false,
        error: e instanceof Error ? `${e.name}: ${e.message}` : String(e),
        cause:
          e instanceof Error && e.cause
            ? String((e.cause as Error).message ?? e.cause)
            : null,
        elapsedMs: Date.now() - started,
        region: process.env.VERCEL_REGION ?? "local",
      },
      { status: 502 },
    );
  }
}
