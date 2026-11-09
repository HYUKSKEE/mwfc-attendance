import { connection } from "next/server";
import { deny, roleOf } from "@/lib/auth";
import { loadPlaceBuckets, savePlaceBuckets } from "@/lib/data";

export async function GET(req: Request) {
  await connection();
  const d = deny(roleOf(req));
  if (d) return d;
  return Response.json({ ok: true, buckets: await loadPlaceBuckets() });
}

export async function POST(req: Request) {
  const p = await req.json().catch(() => ({}));
  const d = deny(roleOf(req, p.token), "admin");
  if (d) return d;
  return Response.json({ ok: true, buckets: await savePlaceBuckets(p.map) });
}
