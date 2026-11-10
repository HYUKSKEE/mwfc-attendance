"use client";

import { useActionState } from "react";
import { login, type ActionResult } from "@/app/actions";
import { Button, inputCls } from "./ui";

export default function LoginForm() {
  const [state, action, pending] = useActionState<ActionResult, FormData>(login, { ok: false });
  return (
    <form action={action}>
      <input name="password" type="password" className={inputCls} placeholder="비밀번호" autoFocus required autoComplete="current-password" />
      {state.error && <p className="mt-2 text-xs text-danger" role="alert">{state.error}</p>}
      <Button type="submit" variant="primary" className="mt-4 w-full" disabled={pending}>{pending ? "확인 중…" : "로그인"}</Button>
    </form>
  );
}
