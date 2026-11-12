import Link from "next/link";
import { connection } from "next/server";
import { Card, ColumnChart, Empty, RankBars, SegBar, Stat, nf } from "@/components/dash";
import { buildDashboard, RANGES } from "@/lib/dashboard";
import { getData } from "@/lib/queries";
import { requireStaff } from "@/lib/session";
import { KST_TODAY, WEEK } from "@/lib/url";

export const metadata = { title: "대시보드" };

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/** 증감(숫자)과 표시 문구. 이전 기간이 없으면 null */
const pct = (c: number, p: number | undefined) =>
  p === undefined ? { d: null, t: "" } : p === 0 ? { d: c > 0 ? 1 : 0, t: c > 0 ? "신규" : "변화 없음" }
    : { d: c - p, t: `${nf((Math.abs(c - p) / p) * 100)}%` };
const abs = (c: number, p: number | undefined, d = 0) =>
  p === undefined ? { d: null, t: "" } : { d: Number((c - p).toFixed(d)), t: nf(Math.abs(c - p), d) };

export default async function DashboardPage(props: PageProps<"/dashboard">) {
  await connection(); // 기준일(오늘)이 요청마다 다르다
  await requireStaff();
  const sp = await props.searchParams;
  const q = Number(one(sp.range));
  const range = (RANGES as readonly number[]).includes(q) ? q : 90;
  const data = await getData();
  const t = buildDashboard(data, KST_TODAY(), range);
  const { cur, prev } = t;
  const vs = `이전 ${range}일 대비`;

  const total = pct(cur.total, prev?.total);
  const meetups = abs(cur.meetups, prev?.meetups);
  const avg = abs(cur.avg, prev?.avg, 1);
  const active = abs(cur.active, prev?.active);
  const maxWeek = Math.max(0, ...t.weeks.map((w) => w.total));
  const maxAvg = Math.max(0, ...t.weekdays.map((w) => w.avg));
  const q2 = t.quality;
  const activeRate = t.memberCount ? Math.round((cur.active / t.memberCount) * 100) : 0;
  const empty = cur.meetups === 0;

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">대시보드</h1>
          <p className="mt-0.5 text-xs text-muted">{t.from} ~ {t.today} · 최근 {range}일</p>
        </div>
        <nav aria-label="기간" className="inline-flex rounded-md border border-line bg-panel p-0.5">
          {RANGES.map((r) => (
            <Link key={r} href={`/dashboard?range=${r}`} replace prefetch={false} aria-current={r === range ? "page" : undefined}
              className={`rounded px-3 py-1 text-xs transition ${r === range ? "bg-accent font-medium text-accent-fg" : "text-muted hover:text-fg"}`}>
              {r}일
            </Link>
          ))}
        </nav>
      </header>

      {empty ? (
        <Card title="이 기간에 집계할 벙이 없어요">
          <Empty>데이터 가져오기로 벙을 수집했는지, 기간을 늘려 보세요.</Empty>
        </Card>
      ) : (
        <>
          {/* KPI */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat hero label="총 참석" value={nf(cur.total)} unit="명" delta={total.d} deltaLabel={`${total.t} ${vs}`} />
            <Stat label="개최한 벙" value={nf(cur.meetups)} unit="개" delta={meetups.d} deltaLabel={`${meetups.t}개 ${vs}`} />
            <Stat label="벙당 평균 참석" value={nf(cur.avg, 1)} unit="명" delta={avg.d} deltaLabel={`${avg.t}명 ${vs}`} />
            <Stat label="참석한 회원" value={nf(cur.active)} unit={`/ ${nf(t.memberCount)}명`} delta={active.d} deltaLabel={`${active.t}명 ${vs}`} />
          </div>
          {!t.hasPrev && (
            <p className="text-[11px] text-muted">
              수집된 데이터가 {t.earliest}부터라서 이전 {range}일과는 비교할 수 없어요. 기간을 줄이면 증감이 보여요.
            </p>
          )}

          {/* 추이 */}
          <Card title="주별 참석 추이" sub={`월~일 기준 · 연한 막대는 일부 기간(첫 주)이거나 진행 중인 주 · 회원 ${activeRate}%가 참석`}>
            <ColumnChart ariaLabel="주별 총 참석 인원" items={t.weeks.map((w) => ({
              label: w.label, value: w.total, tone: w.current || w.partial ? "pending" : "accent",
              tip: `${w.range} · 벙 ${w.meetups}개 · 참석 ${w.total}명${w.current ? " (진행 중)" : w.partial ? " (일부 기간)" : ""}`,
              valueLabel: w.total > 0 && (w.total === maxWeek || w.current) ? String(w.total) : undefined,
            }))} />
            <details className="mt-3 text-xs">
              <summary className="cursor-pointer text-muted hover:text-fg">표로 보기</summary>
              <div className="mt-2 max-h-64 overflow-auto rounded-md border border-line">
                <table className="w-full whitespace-nowrap text-xs">
                  <thead className="sticky top-0 bg-panel2 text-left text-muted">
                    <tr><th className="px-3 py-1.5 font-medium">주</th><th className="px-3 py-1.5 text-right font-medium">벙</th><th className="px-3 py-1.5 text-right font-medium">참석</th></tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {t.weeks.map((w) => (
                      <tr key={w.range}><td className="px-3 py-1.5">{w.range}{w.current ? " (진행 중)" : w.partial ? " (일부 기간)" : ""}</td>
                        <td className="px-3 py-1.5 text-right tabular-nums">{w.meetups}</td><td className="px-3 py-1.5 text-right tabular-nums">{w.total}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card title="요일별 평균 참석" sub="벙이 열린 요일만 집계 · 가장 많은 요일을 강조">
              <ColumnChart height={150} ariaLabel="요일별 벙당 평균 참석 인원" items={t.weekdays.map((w) => ({
                label: WEEK[w.d], value: w.avg, showLabel: true,
                tone: w.n > 0 && w.avg === maxAvg ? "accent" : "muted",
                tip: w.n ? `${WEEK[w.d]}요일 · 벙 ${w.n}개 · 평균 ${nf(w.avg, 1)}명` : `${WEEK[w.d]}요일 · 벙 없음`,
                valueLabel: w.n > 0 ? nf(w.avg, 1) : undefined,
              }))} />
            </Card>

            <Card title="회원 활동 분포" sub="현재 회원이 마지막으로 참석한 시점 기준">
              <SegBar ariaLabel="회원 활동 분포" parts={[
                { label: "최근 30일 참석", value: t.buckets.active, color: "var(--ok)" },
                { label: "31~90일 전 (휴면 주의)", value: t.buckets.warn, color: "var(--warn)" },
                { label: "91일 이상 전", value: t.buckets.lapsed, color: "var(--danger)" },
                { label: "수집 범위 내 기록 없음", value: t.buckets.none, color: "var(--muted)" },
              ]} />
            </Card>

            <Card title="휴면 위험 회원" sub="예전에 3회 이상 나왔지만 최근 30일 안에는 안 나온 회원">
              {t.lapsing.length === 0 ? <Empty>해당하는 회원이 없어요</Empty> : (
                <ul className="divide-y divide-line">
                  {t.lapsing.map((m) => (
                    <li key={m.name} className="flex items-center justify-between gap-2 py-2 text-sm">
                      <span className="truncate">{m.name}</span>
                      <span className="shrink-0 text-xs text-muted">
                        마지막 참석 <b className="text-fg">{m.days}일 전</b> · 누적 {m.n}회
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card title="참석 순위 TOP 10" sub={`최근 ${range}일 참석 횟수`}>
              {t.topMembers.length === 0 ? <Empty>참석 기록이 없어요</Empty> : (
                <RankBars ariaLabel="회원별 참석 횟수" rows={t.topMembers.map((m) => ({ label: m.name, value: m.count, valueText: `${m.count}회` }))} />
              )}
            </Card>

            <Card title="참석이 많았던 벙 TOP 5" sub={`최근 ${range}일`}>
              <RankBars ariaLabel="참석 인원이 많은 벙" rows={t.topMeetups.map((m) => ({
                label: m.title, value: m.count, valueText: `${m.count}명`, sub: m.day.slice(5).replace("-", "/"),
              }))} />
            </Card>

            <Card title="장소별 평균 참석" sub="벙을 많이 연 장소 순 · 오른쪽은 개최 횟수">
              <RankBars ariaLabel="장소별 벙당 평균 참석" rows={t.places.map((p) => ({
                label: p.place, value: p.avg, valueText: `${nf(p.avg, 1)}명`, sub: `${p.n}회`,
              }))} />
            </Card>

            <Card title="출결 품질" sub={`신청 ${nf(q2.signed)}명 중 실제 참석 ${nf(cur.total)}명 (${q2.signed ? nf((cur.total / q2.signed) * 100) : 0}%)`}>
              <SegBar ariaLabel="출결 품질" parts={[
                { label: "정상 참석", value: Math.max(0, q2.normal), color: "var(--ok)" },
                { label: "지각 (참석 인정)", value: q2.late, color: "var(--warn)" },
                { label: "당일취소 (미인정)", value: q2.cancel, color: "var(--accent)" },
                { label: "무단불참 (미인정)", value: q2.noshow, color: "var(--danger)" },
              ]} />
              {q2.marked === 0 && (
                <p className="mt-3 rounded-md bg-panel2 px-3 py-2 text-[11px] text-muted">
                  아직 이 기간에 표시된 지각·당일취소·무단불참이 없어요. 벙 참석자 목록에서 표시하면 여기에 쌓여요.
                </p>
              )}
            </Card>

            <Card title="당일취소·무단불참 상위" sub={`최근 ${range}일 누적`}>
              {t.offenders.length === 0 ? <Empty>기록이 없어요</Empty> : (
                <ul className="divide-y divide-line">
                  {t.offenders.map((o) => (
                    <li key={o.name} className="flex items-center justify-between gap-2 py-2 text-sm">
                      <span className="truncate">{o.name}</span>
                      <span className="flex shrink-0 gap-1.5 text-[11px] font-medium">
                        {o.cancel > 0 && <span className="rounded-full bg-accent-soft px-2 py-0.5 text-accent">당일취소 {o.cancel}</span>}
                        {o.noshow > 0 && <span className="rounded-full bg-danger-soft px-2 py-0.5 text-danger">무단불참 {o.noshow}</span>}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card title="월별 신규 가입" sub={t.hasDeparted
              ? `최근 6개월 가입 ${t.joinTotal}명 중 ${t.joinLeft}명 탈퇴·강퇴${t.joinTotal ? ` (${nf((t.joinLeft / t.joinTotal) * 100)}%)` : ""}`
              : "현재 회원 기준 · 탈퇴·강퇴는 다음 수집부터 반영돼요"} className="lg:col-span-2">
              <ColumnChart height={130} ariaLabel="월별 신규 가입자" items={t.joins.map((j) => {
                const all = j.count + j.left;
                return {
                  label: j.label, value: all, part: j.count, showLabel: true,
                  tip: t.hasDeparted ? `${j.key} · ${all}명 가입 (현재 ${j.count}명 · 탈퇴·강퇴 ${j.left}명)` : `${j.key} · ${all}명 가입`,
                  valueLabel: all > 0 ? String(all) : undefined,
                };
              })} />
              {t.hasDeparted && (
                <p className="mt-2 flex flex-wrap gap-x-3 text-[11px] text-muted">
                  <span className="inline-flex items-center gap-1"><i className="inline-block size-2 rounded-sm bg-accent" />현재 회원</span>
                  <span className="inline-flex items-center gap-1"><i className="inline-block size-2 rounded-sm bg-muted/35" />탈퇴·강퇴</span>
                  {t.recentJoined > 0 && <span>· 최근 90일 가입 중 현재 회원 {t.recentJoined}명 가운데 {t.recentJoinedAttended}명 참석</span>}
                </p>
              )}
            </Card>
          </div>

          <p className="text-[11px] leading-relaxed text-muted">
            수집된 벙(최대 180일) 기준이며, 취소된 벙과 오늘 이후 벙은 제외해요. ‘참석’은 신청자 중 당일취소·무단불참을 뺀 인원이고,
            운영진이 보정한 참석자가 반영돼요. 오늘 벙은 진행 중이라 숫자가 더 늘 수 있어요.
          </p>
        </>
      )}
    </div>
  );
}
