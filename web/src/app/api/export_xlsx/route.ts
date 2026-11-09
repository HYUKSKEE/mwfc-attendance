import { NextRequest, connection } from "next/server";
import { roleOf } from "@/lib/auth";
import { buildXlsx } from "@/lib/xlsx";

export const maxDuration = 60;

export async function GET(req: NextRequest) {
  await connection();
  if (!roleOf(req)) {
    // 인증 만료 → 비밀번호 화면으로
    return Response.redirect(new URL("/?relogin=1", req.url), 302);
  }
  const q = req.nextUrl.searchParams;
  try {
    const { buf } = await buildXlsx({
      tags: q.get("tags") !== "0",
      memo: q.get("memo") !== "0",
      risk: Number(q.get("risk") ?? 30) || 30,
    });
    const ymd = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10).replace(/-/g, "");
    return new Response(new Uint8Array(buf), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename*=UTF-8''somoim_attendance_${ymd}.xlsx`,
      },
    });
  } catch (e) {
    return Response.json({ ok: false, error: String(e instanceof Error ? e.message : e) }, { status: 500 });
  }
}
