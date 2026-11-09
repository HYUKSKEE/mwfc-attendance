import { connection } from "next/server";
import { deny, roleOf } from "@/lib/auth";
import { loadNotes, saveNote } from "@/lib/data";

export async function GET(req: Request) {
  await connection();
  const d = deny(roleOf(req));
  if (d) return d;
  return Response.json({ ok: true, notes: await loadNotes() });
}

export async function POST(req: Request) {
  const p = await req.json().catch(() => ({}));
  const d = deny(roleOf(req, p.token));
  if (d) return d;
  const mid = String(p.mid ?? "").trim();
  if (!mid) return Response.json({ ok: false, error: "mid 없음" }, { status: 400 });
  const entry = await saveNote(mid, p);
  return Response.json({ ok: true, mid, ...entry });
}
