import type { ReactNode } from "react";

// 대시보드용 차트 부품. 모두 서버 컴포넌트(HTML/CSS)라 JS 없이 동작하고,
// 호버/키보드 포커스로 값(툴팁)을 보여준다. 색은 앱 토큰만 쓴다.

export const nf = (n: number, d = 0) => n.toLocaleString("ko-KR", { maximumFractionDigits: d, minimumFractionDigits: d });

export function Card({ title, sub, children, className = "" }: { title: string; sub?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-lg border border-line bg-panel ${className}`}>
      <header className="px-4 pt-3.5">
        <h2 className="text-sm font-semibold">{title}</h2>
        {sub && <p className="mt-0.5 text-xs text-muted">{sub}</p>}
      </header>
      <div className="px-4 pb-4 pt-3">{children}</div>
    </section>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="rounded-md bg-panel2 px-3 py-6 text-center text-xs text-muted">{children}</p>;
}

/** 지표 타일. hero=true 면 대시보드에서 하나뿐인 큰 숫자 */
export function Stat({
  label, value, unit, delta, deltaLabel, hero = false, upIsGood = true,
}: {
  label: string; value: string; unit?: string; hero?: boolean; upIsGood?: boolean;
  /** 이전 기간 대비 증감(숫자). null 이면 비교 불가 */
  delta?: number | null; deltaLabel?: string;
}) {
  const dir = delta == null || delta === 0 ? 0 : delta > 0 ? 1 : -1;
  const good = dir === 0 ? null : (dir > 0) === upIsGood;
  return (
    <div className="rounded-lg border border-line bg-panel px-4 py-3.5">
      <div className="text-xs text-muted">{label}</div>
      <div className={`mt-1 font-semibold leading-none tracking-tight ${hero ? "text-5xl" : "text-3xl"}`}>
        {value}{unit && <span className="ml-1 text-sm font-normal text-muted">{unit}</span>}
      </div>
      <div className="mt-2 h-4 text-[11px]">
        {delta == null ? (
          <span className="text-muted">이전 기간 데이터 없음</span>
        ) : (
          <span className={dir === 0 ? "text-muted" : good ? "text-ok" : "text-danger"}>
            {dir > 0 ? "▲" : dir < 0 ? "▼" : "–"} {deltaLabel}
          </span>
        )}
      </div>
    </div>
  );
}

const niceMax = (v: number) => {
  if (v <= 0) return 4;
  const p = 10 ** Math.floor(Math.log10(v));
  const n = v / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p;
};

export type Col = { label: string; value: number; tip: string; tone?: "accent" | "muted" | "pending"; valueLabel?: string; showLabel?: boolean };

/** 세로 막대. 한 색(강조/흐림)으로만 구분, 눈금은 0/중간/최대 */
export function ColumnChart({ items, ariaLabel, height = 176 }: { items: Col[]; ariaLabel: string; height?: number }) {
  const max = niceMax(Math.max(0, ...items.map((i) => i.value)));
  const every = Math.ceil(items.length / 10); // x축 라벨 겹침 방지
  const tone = { accent: "bg-accent", muted: "bg-muted/35", pending: "bg-accent/40" };
  return (
    <figure role="img" aria-label={ariaLabel} className="m-0">
      <div className="flex gap-2">
        <div className="flex w-8 shrink-0 flex-col justify-between text-right text-[10px] tabular-nums text-muted" style={{ height }}>
          <span>{nf(max)}</span><span>{nf(max / 2, max % 2 ? 1 : 0)}</span><span>0</span>
        </div>
        <div className="relative min-w-0 flex-1" style={{ height }}>
          {[0, 50, 100].map((p) => <div key={p} className="absolute inset-x-0 border-t border-line" style={{ bottom: `${p}%` }} />)}
          <div className="absolute inset-0 flex items-end gap-1 sm:gap-1.5">
            {items.map((it, i) => (
              <div key={i} tabIndex={0} aria-label={it.tip}
                className="group relative flex h-full flex-1 items-end justify-center outline-none">
                <div className={`w-full max-w-6 rounded-t-[4px] transition-opacity group-hover:opacity-80 group-focus-visible:opacity-80 ${tone[it.tone ?? "accent"]}`}
                  style={{ height: `${Math.max(it.value > 0 ? 1.5 : 0, (it.value / max) * 100)}%` }} />
                {it.valueLabel && (
                  <span className="pointer-events-none absolute left-1/2 -translate-x-1/2 text-[10px] font-semibold tabular-nums"
                    style={{ bottom: `calc(${(it.value / max) * 100}% + 2px)` }}>
                    {it.valueLabel}
                  </span>
                )}
                <span role="tooltip"
                  className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-fg px-2 py-1 text-[11px] text-bg shadow group-hover:block group-focus-visible:block">
                  {it.tip}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="ml-10 mt-1.5 flex gap-1 sm:gap-1.5 text-[10px] text-muted">
        {items.map((it, i) => (
          <span key={i} className="flex-1 whitespace-nowrap text-center">
            {(it.showLabel ?? i % every === 0) ? it.label : ""}
          </span>
        ))}
      </div>
    </figure>
  );
}

export type Row = { label: string; value: number; valueText: string; sub?: string; tip?: string };

/** 가로 순위 막대. 한 색, 값은 막대 끝에 */
export function RankBars({ rows, max, ariaLabel }: { rows: Row[]; max?: number; ariaLabel: string }) {
  const top = max ?? Math.max(1, ...rows.map((r) => r.value));
  return (
    <ol aria-label={ariaLabel} className="space-y-2.5">
      {rows.map((r, i) => (
        <li key={i} title={r.tip ?? `${r.label} · ${r.valueText}`}>
          <div className="mb-1 flex items-baseline justify-between gap-2 text-xs">
            <span className="min-w-0 truncate"><span className="mr-1.5 tabular-nums text-muted">{i + 1}</span>{r.label}</span>
            <span className="shrink-0 tabular-nums"><b>{r.valueText}</b>{r.sub && <span className="ml-1.5 text-muted">{r.sub}</span>}</span>
          </div>
          <div className="h-2 rounded-full bg-panel2">
            <div className="h-2 rounded-full bg-accent" style={{ width: `${Math.max(2, (r.value / top) * 100)}%` }} />
          </div>
        </li>
      ))}
    </ol>
  );
}

export type Part = { label: string; value: number; color: string };

/** 분할 막대(얇은 형): 막대에는 글자 없이, 옆 목록이 이름·값·비율을 알려준다 */
export function SegBar({ parts, ariaLabel }: { parts: Part[]; ariaLabel: string }) {
  const total = parts.reduce((s, p) => s + p.value, 0);
  return (
    <div>
      <div role="img" aria-label={`${ariaLabel}: ${parts.map((p) => `${p.label} ${p.value}`).join(", ")}`}
        className="flex h-3 gap-0.5 overflow-hidden rounded-full">
        {parts.filter((p) => p.value > 0).map((p) => (
          <div key={p.label} title={`${p.label} ${nf(p.value)} (${nf((p.value / total) * 100)}%)`}
            className="h-full first:rounded-l-full last:rounded-r-full" style={{ width: `${(p.value / total) * 100}%`, background: p.color }} />
        ))}
      </div>
      <ul className="mt-3 space-y-1.5">
        {parts.map((p) => (
          <li key={p.label} className="flex items-center justify-between gap-2 text-xs">
            <span className="flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-sm" style={{ background: p.color }} />{p.label}</span>
            <span className="tabular-nums"><b>{nf(p.value)}</b><span className="ml-1.5 text-muted">{total ? nf((p.value / total) * 100) : 0}%</span></span>
          </li>
        ))}
      </ul>
    </div>
  );
}
