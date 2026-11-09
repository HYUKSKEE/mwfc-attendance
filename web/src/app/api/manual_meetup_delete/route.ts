import { deny, roleOf } from "@/lib/auth";
import { loadManual, saveManual } from "@/lib/data";

export async function POST(req: Request) {
  const p = await req.json().catch(() => ({}));
  const d = deny(roleOf(req, p.token), "admin");
  if (d) return d;
  await saveManual((await loadManual()).filter((m) => m.id !== p.id));
  return Response.json({ ok: true });
}
