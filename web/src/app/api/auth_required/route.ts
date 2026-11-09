import { connection } from "next/server";
import { lockState } from "@/lib/auth";
import { aiEnabled } from "@/lib/ai";

export async function GET() {
  await connection();
  const s = lockState();
  return Response.json({ required: s !== "open", ai: aiEnabled(), misconfigured: s === "misconfigured" });
}
