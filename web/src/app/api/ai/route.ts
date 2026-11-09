import { deny, roleOf } from "@/lib/auth";
import { callAi } from "@/lib/ai";

export const maxDuration = 60;

export async function POST(req: Request) {
  const p = await req.json().catch(() => ({}));
  const d = deny(roleOf(req, p.token));
  if (d) return d;
  const q = String(p.q ?? "").trim();
  if (!q) return Response.json({ ok: false, error: "질문이 비었어요" }, { status: 400 });
  return Response.json(await callAi(q));
}
