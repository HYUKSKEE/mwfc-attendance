import { deny, roleOf } from "@/lib/auth";
import { loadManual, loadRawMeetups, saveManual, saveOverride } from "@/lib/data";

// 벙 참석자 수동 보정: 원본은 건드리지 않고 '차이'만 저장
export async function POST(req: Request) {
  const p = await req.json().catch(() => ({}));
  const d = deny(roleOf(req, p.token), "admin");
  if (d) return d;
  const wt = String(p.w_t ?? "");
  const desired = new Set<string>((p.ids ?? []).map(String));

  // 수동 벙이면 그 벙의 참석자를 직접 수정
  const manual = await loadManual();
  const mm = manual.find((m) => String(m.w_t) === wt);
  if (mm) {
    mm.attendee_ids = [...desired].sort();
    await saveManual(manual);
    return Response.json({ ok: true, w_t: wt, manual: true });
  }

  const orig = (await loadRawMeetups()).find((m) => String(m.w_t) === wt);
  if (!orig) return Response.json({ ok: false, error: "해당 벙을 찾을 수 없음" }, { status: 404 });
  const origSet = new Set(orig.attendee_ids ?? []);
  const add = [...desired].filter((i) => !origSet.has(i)).sort();
  const remove = [...origSet].filter((i) => !desired.has(i)).sort();
  await saveOverride(wt, add, remove);
  return Response.json({ ok: true, w_t: wt, add, remove });
}
