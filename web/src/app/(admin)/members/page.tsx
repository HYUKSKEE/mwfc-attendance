import Link from "next/link";
import { Icon, inputCls } from "@/components/ui";
import type { Member } from "@/lib/types";
import { getData } from "@/lib/queries";
import { requireSession } from "@/lib/session";

export const metadata = { title: "회원" };

type Col = { key: string; label: string; num?: boolean; get: (m: Member) => string | number | null };

const COLS: Col[] = [
  { key: "name", label: "이름", get: (m) => m.name },
  { key: "joined", label: "가입일", get: (m) => (/^\d/.test(m.joined_date ?? "") ? m.joined_date : null) },
  { key: "last", label: "마지막 참가", get: (m) => (/^\d/.test(m.last_attended ?? "") ? m.last_attended! : null) },
  { key: "attend", label: "참가 횟수", num: true, get: (m) => m.attend_count ?? 0 },
  { key: "late", label: "지각", num: true, get: (m) => m.late_count ?? 0 },
  { key: "cancel", label: "당일취소", num: true, get: (m) => m.cancel_count ?? 0 },
  { key: "noshow", label: "무단불참", num: true, get: (m) => m.noshow_count ?? 0 },
];

/** 같은 열을 누를 때마다 오름차순 → 내림차순 → 초기화 */
function sortHref(q: string, key: string, cur: string, dir: string) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (cur !== key) { params.set("sort", key); params.set("dir", "asc"); }
  else if (dir === "asc") { params.set("sort", key); params.set("dir", "desc"); }
  const qs = params.toString();
  return qs ? `/members?${qs}` : "/members";
}

export default async function MembersPage(props: PageProps<"/members">) {
  await requireSession();
  const sp = await props.searchParams;
  const q = (Array.isArray(sp.q) ? sp.q[0] : sp.q ?? "").trim();
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
  const col = COLS.find((c) => c.key === one(sp.sort));
  const dir = one(sp.dir) === "desc" ? "desc" : "asc";
  const data = await getData();

  const rows = data.members
    .filter((m) => !m.banned && (!q || m.name.toLowerCase().includes(q.toLowerCase())))
    .sort((a, b) => {
      if (!col) {
        // 기본: 마지막 참가 최신순 → 이름
        return (b.last_attended ?? "").localeCompare(a.last_attended ?? "") || a.name.localeCompare(b.name, "ko");
      }
      const x = col.get(a);
      const y = col.get(b);
      if (x === null || y === null) return x === y ? 0 : x === null ? 1 : -1; // 값 없는 행은 항상 아래
      const c = typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y), "ko");
      return (dir === "desc" ? -c : c) || a.name.localeCompare(b.name, "ko");
    });

  return (
    <section className="rounded-lg border border-line bg-panel">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
        <h1 className="text-base font-semibold">회원 <span className="ml-1 text-sm font-normal text-muted">{rows.length}명</span></h1>
        {/* GET 폼: JS 없이도 동작하는 검색 (결과가 URL 에 남음) */}
        <form action="/members" className="relative w-full sm:w-64">
          <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted"><Icon name="search" size={14} /></span>
          {col && <input type="hidden" name="sort" value={col.key} />}
          {col && <input type="hidden" name="dir" value={dir} />}
          <input name="q" defaultValue={q} className={`${inputCls} pl-8`} placeholder="이름 검색 후 Enter" />
        </form>
      </header>
      <div className="max-h-[calc(100dvh-13rem)] overflow-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="sticky top-0 z-10 bg-panel2 text-left text-xs text-muted shadow-[0_1px_0_var(--line)]">
            <tr>
              {COLS.map((c) => {
                const active = col?.key === c.key;
                return (
                  <th key={c.key} scope="col" className={`px-4 py-2 font-medium ${c.num ? "text-right" : ""}`}
                    aria-sort={active ? (dir === "asc" ? "ascending" : "descending") : "none"}>
                    <Link href={sortHref(q, c.key, col?.key ?? "", dir)} prefetch={false} replace
                      title="누를 때마다 오름차순 → 내림차순 → 초기화"
                      className={`inline-flex items-center gap-1 hover:text-fg ${active ? "text-fg" : ""}`}>
                      {c.label}
                      <span aria-hidden className={active ? "text-accent" : "opacity-40"}>
                        {active ? (dir === "asc" ? "▲" : "▼") : "↕"}
                      </span>
                    </Link>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((m) => (
              <tr key={m.mid} className="hover:bg-panel2">
                <td className="px-4 py-2 font-medium">{m.name}</td>
                <td className="px-4 py-2 tabular-nums text-muted">{m.joined_date || "—"}</td>
                <td className="px-4 py-2 tabular-nums">{m.last_attended || "기록없음"}</td>
                <td className="px-4 py-2 text-right tabular-nums">{m.attend_count ?? 0}</td>
                <td className={`px-4 py-2 text-right tabular-nums ${m.late_count ? "font-medium text-warn" : "text-muted"}`}>{m.late_count ?? 0}</td>
                <td className={`px-4 py-2 text-right tabular-nums ${m.cancel_count ? "font-medium text-accent" : "text-muted"}`}>{m.cancel_count ?? 0}</td>
                <td className={`px-4 py-2 text-right tabular-nums ${m.noshow_count ? "font-medium text-danger" : "text-muted"}`}>{m.noshow_count ?? 0}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-muted">
                {q ? "검색 결과가 없어요" : "회원이 없어요. 우측 상단 ‘데이터 가져오기’로 수집해 보세요."}
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
