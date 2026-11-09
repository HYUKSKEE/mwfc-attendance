import { connection } from "next/server";
import { deny, roleOf } from "@/lib/auth";
import { aiSystemPrompt, setAiSystemPrompt } from "@/lib/ai";

export async function GET(req: Request) {
  await connection();
  const d = deny(roleOf(req), "admin");
  if (d) return d;
  return Response.json({ ok: true, prompt: await aiSystemPrompt() });
}

export async function POST(req: Request) {
  const p = await req.json().catch(() => ({}));
  const d = deny(roleOf(req, p.token), "admin");
  if (d) return d;
  const text = String(p.prompt ?? "").trim();
  if (text) await setAiSystemPrompt(text);
  return Response.json({ ok: true, prompt: await aiSystemPrompt() });
}
