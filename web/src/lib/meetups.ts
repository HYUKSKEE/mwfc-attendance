import {
  dateToWt, loadAbsent, loadLate, loadManual, loadRawMeetups, markDeleted, saveAbsent, saveEdit, saveLate, saveManual, saveOverride, setCancelled,
} from "./data";
import type { Meetup, Status } from "./types";

// 벙 쓰기 로직 (서버 액션에서 사용). 소모임 원본은 건드리지 않고 '차이'만 저장한다.

/**
 * 최종 신청자 + 상태(지각/직전취소/무단불참)로 맞춤. 수동 벙은 직접 수정, 수집 벙은 add/remove 차이 저장.
 * 상태는 신청자에게만 붙고, 한 사람당 하나(없으면 정상 참석). 빠진 사람의 상태는 함께 정리한다.
 */
export async function setAttendance(wt: string, ids: string[], status: Record<string, Status>) {
  await setAttendeeIds(wt, ids);
  const set = new Set(ids);
  const late: string[] = [];
  const absent: Record<string, "cancel" | "noshow"> = {};
  for (const [id, st] of Object.entries(status)) {
    if (!set.has(id)) continue;
    if (st === "late") late.push(id);
    else if (st === "cancel" || st === "noshow") absent[id] = st;
  }
  await saveLate(wt, late);
  await saveAbsent(wt, absent);
}

async function setAttendeeIds(wt: string, ids: string[]) {
  const desired = new Set(ids);
  const manual = await loadManual();
  const mm = manual.find((m) => String(m.w_t) === wt);
  if (mm) {
    mm.attendee_ids = [...desired].sort();
    await saveManual(manual);
    return;
  }
  const orig = (await loadRawMeetups()).find((m) => String(m.w_t) === wt);
  if (!orig) throw new Error("해당 벙을 찾을 수 없어요");
  const origSet = new Set(orig.attendee_ids ?? []);
  await saveOverride(
    wt,
    [...desired].filter((i) => !origSet.has(i)).sort(),
    [...origSet].filter((i) => !desired.has(i)).sort(),
  );
}

export const cancelMeetup = (wt: string, cancelled: boolean) => setCancelled(wt, cancelled);

/** 수동 벙은 완전 삭제, 수집 벙은 숨김(재수집해도 안 돌아옴) */
export async function deleteMeetup(wt: string) {
  if ((await loadLate())[wt]) await saveLate(wt, []);
  if ((await loadAbsent())[wt]) await saveAbsent(wt, {});
  const manual = await loadManual();
  if (manual.some((m) => String(m.w_t) === wt)) {
    await saveManual(manual.filter((m) => String(m.w_t) !== wt));
  } else {
    await markDeleted(wt);
  }
}

export async function editMeetup(wt: string, f: { title: string; date: string; place: string }) {
  const manual = await loadManual();
  const mm = manual.find((m) => String(m.w_t) === wt);
  if (mm) {
    mm.title = f.title.slice(0, 100);
    mm.place = f.place.trim().slice(0, 100);
    mm.date_str = f.date;
    mm.date = Number(f.date.replace(/-/g, ""));
    await saveManual(manual); // w_t 는 고유 키라 유지
    return;
  }
  await saveEdit(wt, { title: f.title, date: f.date, place: f.place });
}

export async function addMeetup(f: { title: string; date: string; place: string }): Promise<Meetup> {
  const mm: Meetup = {
    id: "man_" + Date.now(),
    title: f.title.slice(0, 100),
    date: Number(f.date.replace(/-/g, "")),
    date_str: f.date,
    w_t: dateToWt(f.date),
    place: f.place.trim().slice(0, 100),
    attendee_ids: [],
  };
  const manual = await loadManual();
  // 같은 날짜에 연달아 추가해도 w_t(키)가 겹치지 않게
  while (manual.some((m) => m.w_t === mm.w_t)) mm.w_t += 1;
  manual.push(mm);
  await saveManual(manual);
  return mm;
}
