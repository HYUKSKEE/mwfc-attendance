"use client";

import { useMemo, useOptimistic, useState, useTransition } from "react";
import { setAttendees } from "@/app/actions";
import type { Status } from "@/lib/types";
import { Icon, inputCls } from "./ui";

type P = { id: string; name: string };

/**
 * 참석자 목록 + 추가/제거. useOptimistic 으로 누르는 즉시 화면에 반영하고,
 * 서버 액션이 끝나면 서버 데이터(최종값)로 맞춰진다. 실패하면 자동으로 원복.
 */
type State = { ids: string[]; st: Record<string, Status> };

/** 신청자 한 명에게 붙일 수 있는 상태. 한 번에 하나만(다시 누르면 해제) */
const STATUSES: { key: Status; label: string; hint: string; on: string; hover: string }[] = [
  { key: "late", label: "지각", hint: "지각 (출석 인정)", on: "bg-warn-soft text-warn", hover: "hover:border-warn hover:text-warn" },
  { key: "cancel", label: "당일취소", hint: "당일 취소 (출석 미인정)", on: "bg-accent-soft text-accent", hover: "hover:border-accent hover:text-accent" },
  { key: "noshow", label: "무단불참", hint: "무단 불참 (출석 미인정)", on: "bg-danger-soft text-danger", hover: "hover:border-danger hover:text-danger" },
];

export default function AttendeeEditor({
  wt, attendeeIds, status, members, canEdit,
}: { wt: number; attendeeIds: string[]; status: Record<string, Status>; members: P[]; canEdit: boolean }) {
  const [{ ids, st }, setOptimistic] = useOptimistic<State, State>(
    { ids: attendeeIds, st: status },
    (_cur, next) => next,
  );
  const count = (k: Status) => ids.filter((i) => st[i] === k).length;
  const lateN = count("late");
  const cancelN = count("cancel");
  const noshowN = count("noshow");
  const attendN = ids.length - cancelN - noshowN;
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
      const r = await setAttendees(wt, next.ids, next.st);
      if (!r.ok) setErr(r.error ?? "저장에 실패했어요");
    });

  const add = (id: string) => { commit({ ids: [...ids, id], st }); setQ(""); };
  const remove = (id: string) => {
    if (!window.confirm(`${nameOf.get(id) ?? "이 회원"}님을 신청자에서 제거할까요?`)) return;
    const { [id]: _drop, ...rest } = st;
    commit({ ids: ids.filter((x) => x !== id), st: rest });
  };
  const toggle = (id: string, k: Status) => {
    const label = STATUSES.find((s) => s.key === k)!.label;
    const who = nameOf.get(id) ?? "이 회원";
    if (!window.confirm(st[id] === k ? `${who}님의 ${label} 표시를 해제할까요?` : `${who}님을 ${label}(으)로 표시할까요?`)) return;
    const { [id]: cur, ...rest } = st;
    commit({ ids, st: cur === k ? rest : { ...rest, [id]: k } });
  };

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
          참석 <b className="text-fg">{attendN}</b>명
          {lateN > 0 && <> · <span className="font-medium text-warn">지각 {lateN}</span></>}
          {cancelN > 0 && <> · <span className="font-medium text-accent">당일취소 {cancelN}</span></>}
          {noshowN > 0 && <> · <span className="font-medium text-danger">무단불참 {noshowN}</span></>}
        </p>
        {rows.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-muted">참석자가 없어요</p>
        ) : (
          <ul className="divide-y divide-line">
            {rows.map((a, i) => {
              const cur = st[a.id];
              const out = cur === "cancel" || cur === "noshow"; // 출석 미인정
              return (
                <li key={a.id} className="flex items-center justify-between gap-2 px-4 py-2">
                  <span className={`flex min-w-0 items-center gap-2.5 text-sm ${out ? "text-muted line-through" : ""}`}>
                    <span className="w-5 shrink-0 text-right text-xs tabular-nums text-muted">{i + 1}</span>
                    <span className="truncate">{a.name}</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-1">
                    {STATUSES.map((s) =>
                      canEdit ? (
                        <button key={s.key} onClick={() => toggle(a.id, s.key)} aria-pressed={cur === s.key}
                          title={cur === s.key ? `${s.label} 해제` : s.hint}
                          className={`rounded-full border px-2 py-0.5 text-[11px] font-medium transition ${
                            cur === s.key ? `border-transparent ${s.on}` : `border-line text-muted ${s.hover}`}`}>
                          {s.label}
                        </button>
                      ) : (
                        cur === s.key && (
                          <span key={s.key} className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${s.on}`}>{s.label}</span>
                        )
                      ),
                    )}
                    {canEdit && (
                      <button onClick={() => remove(a.id)} aria-label={`${a.name} 제거`} title="신청자에서 제거"
                        className="ml-0.5 rounded p-1 text-muted hover:bg-danger-soft hover:text-danger">
                        <Icon name="x" size={14} />
                      </button>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </>
  );
}
