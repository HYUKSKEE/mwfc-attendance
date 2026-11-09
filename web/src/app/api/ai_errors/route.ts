import { NextRequest, connection } from "next/server";
import { deny, roleOf } from "@/lib/auth";
import { clearAiErrors, readAiErrors } from "@/lib/ai";

export async function GET(req: NextRequest) {
  await connection();
  const d = deny(roleOf(req), "admin");
  if (d) return d;
  if (req.nextUrl.searchParams.get("clear") === "1") {
    await clearAiErrors();
    return Response.json({ ok: true, log: "" });
  }
  return Response.json({ ok: true, log: await readAiErrors() });
}
