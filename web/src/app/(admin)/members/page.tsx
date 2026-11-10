import { Icon, inputCls } from "@/components/ui";
import { getData } from "@/lib/queries";
import { requireSession } from "@/lib/session";

export const metadata = { title: "회원" };

export default async function MembersPage(props: PageProps<"/members">) {
  await requireSession();
  const sp = await props.searchParams;
  const q = (Array.isArray(sp.q) ? sp.q[0] : sp.q ?? "").trim();
  const data = await getData();

  const rows = data.members
    .filter((m) => !m.banned && (!q || m.name.toLowerCase().includes(q.toLowerCase())))
    .sort((a, b) => (b.last_attended ?? "").localeCompare(a.last_attended ?? "") || a.name.localeCompare(b.name, "ko"));

  return (
    <section className="rounded-lg border border-line bg-panel">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
        <h1 className="text-base font-semibold">회원 <span className="ml-1 text-sm font-normal text-muted">{rows.length}명</span></h1>
        {/* GET 폼: JS 없이도 동작하는 검색 (결과가 URL 에 남음) */}
        <form action="/members" className="relative w-full sm:w-64">
          <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted"><Icon name="search" size={14} /></span>
          <input name="q" defaultValue={q} className={`${inputCls} pl-8`} placeholder="이름 검색 후 Enter" />
        </form>
      </header>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-panel2 text-left text-xs text-muted">
            <tr>
              <th className="px-4 py-2 font-medium">이름</th>
              <th className="px-4 py-2 font-medium">가입일</th>
              <th className="px-4 py-2 font-medium">마지막 참가</th>
              <th className="px-4 py-2 text-right font-medium">참가 횟수</th>
              <th className="px-4 py-2 text-right font-medium">지각</th>
              <th className="px-4 py-2 text-right font-medium">당일취소</th>
              <th className="px-4 py-2 text-right font-medium">무단불참</th>
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
