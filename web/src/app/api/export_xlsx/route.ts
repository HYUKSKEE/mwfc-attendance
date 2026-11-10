import { NextRequest, connection } from "next/server";
import { roleOf } from "@/lib/auth";
import { buildAttendanceSheet, buildXlsx } from "@/lib/xlsx";

export const maxDuration = 60;

export async function GET(req: NextRequest) {
  await connection();
  if (!roleOf(req)) {
    // 인증 만료 → 비밀번호 화면으로
    return Response.redirect(new URL("/login", req.url), 302);
  }
  const q = req.nextUrl.searchParams;
  const ymd = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10).replace(/-/g, "");
  const XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  try {
    if (q.get("mode") === "sheet") {
      // 출석표: 최근 N일(최대 180) 벙 × 회원
      const r = await buildAttendanceSheet({
        days: Number(q.get("days") ?? 30) || 30,
        includeAbsent: q.get("absent") !== "0",
      });
      return new Response(new Uint8Array(r.buf), {
        headers: {
          "Content-Type": XLSX,
          "Content-Disposition": `attachment; filename*=UTF-8''attendance_${r.from}_${r.to}.xlsx`,
          "X-Sheet-Meetups": String(r.meetups),
          "X-Sheet-Members": String(r.members),
        },
      });
    }
    const { buf } = await buildXlsx({
      tags: q.get("tags") !== "0",
      memo: q.get("memo") !== "0",
      risk: Number(q.get("risk") ?? 30) || 30,
    });
    return new Response(new Uint8Array(buf), {
      headers: {
        "Content-Type": XLSX,
        "Content-Disposition": `attachment; filename*=UTF-8''somoim_attendance_${ymd}.xlsx`,
      },
    });
  } catch (e) {
    return Response.json({ ok: false, error: String(e instanceof Error ? e.message : e) }, { status: 500 });
  }
}
