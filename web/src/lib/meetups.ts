import {
  dateToWt, loadLate, loadManual, loadRawMeetups, markDeleted, saveEdit, saveLate, saveManual, saveOverride, setCancelled,
} from "./data";
import type { Meetup } from "./types";

// 벙 쓰기 로직 (서버 액션에서 사용). 소모임 원본은 건드리지 않고 '차이'만 저장한다.

/**
 * 최종 참석자 + 지각자 목록으로 맞춤. 수동 벙은 직접 수정, 수집 벙은 add/remove 차이 저장.
 * 지각자는 항상 참석자의 부분집합으로 정리한다(빠진 사람은 지각도 해제).
 */
export async function setAttendance(wt: string, ids: string[], lateIds: string[]) {
  await setAttendeeIds(wt, ids);
  const set = new Set(ids);
  await saveLate(wt, lateIds.filter((i) => set.has(i)));
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
