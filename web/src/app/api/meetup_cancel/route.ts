import { deny, roleOf } from "@/lib/auth";
import { setCancelled } from "@/lib/data";

export async function POST(req: Request) {
  const p = await req.json().catch(() => ({}));
  const d = deny(roleOf(req, p.token), "admin");
  if (d) return d;
  const wt = String(p.w_t ?? "");
  const now = await setCancelled(wt, p.cancelled !== false);
  return Response.json({ ok: true, w_t: wt, cancelled: now });
}
