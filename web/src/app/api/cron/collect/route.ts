import { revalidateTag } from "next/cache";
import { connection } from "next/server";
import { getConfig } from "@/lib/config";
import { DATA_TAG } from "@/lib/queries";
import { collectData } from "@/lib/somoim/collect";
import { acquireLock, releaseLock } from "@/lib/store";

// Vercel Cron 이 호출 (vercel.json crons). CRON_SECRET 이 설정돼 있어야 동작한다.
export const maxDuration = 300;

export async function GET(req: Request) {
  await connection();
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  if (!(await acquireLock("collect", maxDuration + 30))) {
    return Response.json({ ok: false, error: "already running" }, { status: 409 });
  }
  try {
    const r = await collectData(getConfig().autoCollectDays);
    revalidateTag(DATA_TAG, { expire: 0 }); // 화면 캐시 갱신
    return Response.json({ ok: true, ...r });
  } catch (e) {
    return Response.json({ ok: false, error: String(e instanceof Error ? e.message : e) }, { status: 500 });
  } finally {
    await releaseLock("collect");
  }
}
