"use client";

import { useMemo, useOptimistic, useState, useTransition } from "react";
import { setAttendees } from "@/app/actions";
import { Icon, inputCls } from "./ui";

type P = { id: string; name: string };

/**
 * 참석자 목록 + 추가/제거. useOptimistic 으로 누르는 즉시 화면에 반영하고,
 * 서버 액션이 끝나면 서버 데이터(최종값)로 맞춰진다. 실패하면 자동으로 원복.
 */
type State = { ids: string[]; late: string[] };

export default function AttendeeEditor({
  wt, attendeeIds, lateIds, members, canEdit,
}: { wt: number; attendeeIds: string[]; lateIds: string[]; members: P[]; canEdit: boolean }) {
  const [{ ids, late }, setOptimistic] = useOptimistic<State, State>(
    { ids: attendeeIds, late: lateIds },
    (_cur, next) => next,
  );
  const lateSet = useMemo(() => new Set(late), [late]);
  const [, start] = useTransition();
  const [q, setQ] = useState("");
  const [err, setErr] = useState("");

  const nameOf = useMemo(() => new Map(members.map((m) => [m.id, m.name])), [members]);
  const rows = useMemo(
    () =>
      ids
        .map((id) => ({ id, name: nameOf.get(id) ?? `(미확인 ${id.slice(0, 6)})` }))
        .sort((a, b) => a.name.localeCompare(b.name, "ko")),
    [ids, nameOf],
  );

  const candidates = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return [];
    const has = new Set(ids);
    return members
      .filter((m) => !has.has(m.id) && m.name.toLowerCase().includes(t))
      .sort((a, b) => a.name.localeCompare(b.name, "ko"))
      .slice(0, 8);
  }, [q, members, ids]);

  const commit = (next: State) =>
    start(async () => {
      setErr("");
      setOptimistic(next);
      const r = await setAttendees(wt, next.ids, next.late);
      if (!r.ok) setErr(r.error ?? "저장에 실패했어요");
    });

  const add = (id: string) => { commit({ ids: [...ids, id], late }); setQ(""); };
  const remove = (id: string) => commit({ ids: ids.filter((x) => x !== id), late: late.filter((x) => x !== id) });
  const toggleLate = (id: string) =>
    commit({ ids, late: lateSet.has(id) ? late.filter((x) => x !== id) : [...late, id] });

  return (
    <>
      {canEdit && (
        <div className="relative border-b border-line px-4 py-3">
          <div className="relative">
            <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted"><Icon name="search" size={14} /></span>
            <input className={`${inputCls} pl-8`} placeholder="이름으로 검색해 인원 추가" value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && candidates[0] && add(candidates[0].id)} />
          </div>
          {q.trim() && (
            <ul className="absolute inset-x-4 top-[3.4rem] z-10 max-h-56 overflow-auto rounded-md border border-line bg-panel shadow-lg">
              {candidates.length === 0 && <li className="px-3 py-2.5 text-xs text-muted">일치하는 회원이 없거나 이미 참석 중이에요</li>}
              {candidates.map((m) => (
                <li key={m.id}>
                  <button onClick={() => add(m.id)}
                    className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-accent-soft">
                    <span>{m.name}</span>
                    <span className="inline-flex items-center gap-1 text-xs text-accent"><Icon name="plus" size={12} />추가</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      {err && <p className="bg-danger-soft px-4 py-2 text-xs text-danger" role="alert">{err}</p>}

      <div className="min-h-[120px] flex-1 overflow-auto">
        <p className="border-b border-line px-4 py-2 text-xs text-muted" aria-live="polite">
          참석 <b className="text-fg">{rows.length}</b>명
          {lateSet.size > 0 && <> · <span className="font-medium text-warn">지각 {lateSet.size}명</span></>}
        </p>
        {rows.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-muted">참석자가 없어요</p>
        ) : (
          <ul className="divide-y divide-line">
            {rows.map((a, i) => (
              <li key={a.id} className="flex items-center justify-between px-4 py-2">
                <span className="flex items-center gap-2.5 text-sm">
                  <span className="w-5 text-right text-xs tabular-nums text-muted">{i + 1}</span>
                  {a.name}
                </span>
                <span className="flex items-center gap-1.5">
                  {canEdit ? (
                    <button onClick={() => toggleLate(a.id)} aria-pressed={lateSet.has(a.id)}
                      title={lateSet.has(a.id) ? "지각 해제" : "지각으로 표시"}
                      className={`rounded-full border px-2 py-0.5 text-[11px] font-medium transition ${
                        lateSet.has(a.id)
                          ? "border-transparent bg-warn-soft text-warn"
                          : "border-line text-muted hover:border-warn hover:text-warn"}`}>
                      지각
                    </button>
                  ) : (
                    lateSet.has(a.id) && <span className="rounded-full bg-warn-soft px-2 py-0.5 text-[11px] font-medium text-warn">지각</span>
                  )}
                  {canEdit && (
                    <button onClick={() => remove(a.id)} aria-label={`${a.name} 제거`} title="참석자에서 제거"
                      className="rounded p-1 text-muted hover:bg-danger-soft hover:text-danger">
                      <Icon name="x" size={14} />
                    </button>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
