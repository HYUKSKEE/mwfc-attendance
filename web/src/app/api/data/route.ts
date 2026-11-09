import { connection } from "next/server";
import { deny, roleOf } from "@/lib/auth";
import { mergedData } from "@/lib/data";

export async function GET(req: Request) {
  await connection();
  const d = deny(roleOf(req));
  if (d) return d;
  try {
    return Response.json(await mergedData());
  } catch (e) {
    return Response.json({ error: String(e instanceof Error ? e.message : e) }, { status: 500 });
  }
}
