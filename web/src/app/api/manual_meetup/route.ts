import { deny, roleOf } from "@/lib/auth";
import { dateToWt, loadManual, saveManual } from "@/lib/data";
import type { Meetup } from "@/lib/types";

export async function POST(req: Request) {
  const p = await req.json().catch(() => ({}));
  const d = deny(roleOf(req, p.token), "admin");
  if (d) return d;
  const title = String(p.title ?? "").trim();
  const date = String(p.date ?? "").trim();
  if (!title || !date) return Response.json({ ok: false, error: "제목·날짜 필요" }, { status: 400 });
  const digits = date.replace(/-/g, "");
  const mm: Meetup = {
    id: "man_" + Date.now(),
    title,
    date: /^\d+$/.test(digits) ? Number(digits) : null,
    date_str: date,
    w_t: dateToWt(date),
    place: String(p.place ?? "").trim(),
    attendee_ids: (p.ids ?? []).map(String),
  };
  const manual = await loadManual();
  manual.push(mm);
  await saveManual(manual);
  return Response.json({ ok: true, meetup: mm });
}
