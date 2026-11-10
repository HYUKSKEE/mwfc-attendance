"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { updateTag } from "next/cache";
import { checkLogin, issueToken } from "@/lib/auth";
import { adminError, SESSION_COOKIE, SESSION_MAX_AGE } from "@/lib/session";
import { DATA_TAG } from "@/lib/queries";
import { collectData } from "@/lib/somoim/collect";
import { acquireLock, releaseLock } from "@/lib/store";
import { addMeetup, cancelMeetup, deleteMeetup, editMeetup, setAttendance } from "@/lib/meetups";
import type { Status } from "@/lib/types";
import { calHref } from "@/lib/url";

export type ActionResult = { ok: boolean; error?: string; message?: string };
const fail = (error: string): ActionResult => ({ ok: false, error });
const msg = (e: unknown) => (e instanceof Error ? e.message : "실패했어요");

// ---------- 로그인 / 로그아웃 ----------
export async function login(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const role = checkLogin(String(formData.get("password") ?? ""));
  if (!role) return fail("비밀번호가 맞지 않아요");
  (await cookies()).set(SESSION_COOKIE, issueToken(role), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  redirect("/");
}

export async function logout() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/login");
}

// ---------- 벙 / 참석자 ----------
export async function setAttendees(wt: number, ids: string[], status: Record<string, Status>): Promise<ActionResult> {
  const err = await adminError();
  if (err) return fail(err);
  try {
    await setAttendance(String(wt), ids, status);
    updateTag(DATA_TAG);
    return { ok: true };
  } catch (e) {
    return fail(msg(e));
  }
}

export async function setCancelled(wt: number, cancelled: boolean): Promise<ActionResult> {
  const err = await adminError();
  if (err) return fail(err);
  try {
    await cancelMeetup(String(wt), cancelled);
    updateTag(DATA_TAG);
    return { ok: true, message: cancelled ? "벙을 취소 처리했어요 (출석 미인정)" : "취소를 해제했어요" };
  } catch (e) {
    return fail(msg(e));
  }
}

export async function removeMeetup(wt: number): Promise<ActionResult> {
  const err = await adminError();
  if (err) return fail(err);
  try {
    await deleteMeetup(String(wt));
    updateTag(DATA_TAG);
    return { ok: true, message: "벙을 삭제했어요" };
  } catch (e) {
    return fail(msg(e));
  }
}

/** 벙 추가/수정 폼 (useActionState). 성공하면 해당 벙을 연 캘린더로 이동 */
export async function saveMeetup(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const err = await adminError();
  if (err) return fail(err);
  const mode = String(formData.get("mode"));
  const title = String(formData.get("title") ?? "").trim();
  const date = String(formData.get("date") ?? "").trim();
  const place = String(formData.get("place") ?? "");
  if (!title) return fail("벙 이름을 입력하세요");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return fail("날짜를 선택하세요");

  let wt: number;
  try {
    if (mode === "edit") {
      wt = Number(formData.get("wt"));
      await editMeetup(String(wt), { title, date, place });
    } else {
      wt = (await addMeetup({ title, date, place })).w_t;
    }
    updateTag(DATA_TAG);
  } catch (e) {
    return fail(msg(e));
  }
  redirect(calHref({ month: date.slice(0, 7), meetup: wt }));
}

// ---------- 소모임 수집 ----------
export async function runCollect(days: number): Promise<ActionResult> {
  const err = await adminError();
  if (err) return fail(err);
  if (!(await acquireLock("collect", 330))) return fail("이미 수집이 진행 중이에요. 잠시 후 다시 시도하세요.");
  try {
    const r = await collectData(days); // 최대 180일로 제한됨
    updateTag(DATA_TAG);
    return { ok: true, message: `완료: 회원 ${r.members}명 · 벙 ${r.meetups}개` };
  } catch (e) {
    return fail(msg(e));
  } finally {
    await releaseLock("collect");
  }
}
