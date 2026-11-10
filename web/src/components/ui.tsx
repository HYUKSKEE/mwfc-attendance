import Link from "next/link";
import type { ReactNode } from "react";

// 서버/클라이언트 어디서든 쓰는 순수 UI 조각 (상태 없음)
const P = {
  calendar: "M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z",
  users: "M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2M10 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM21 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
  download: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3",
  refresh: "M21 12a9 9 0 0 1-15.5 6.2L3 16M3 12A9 9 0 0 1 18.5 5.8L21 8M21 3v5h-5M3 21v-5h5",
  plus: "M12 5v14M5 12h14",
  check: "M20 6 9 17l-5-5",
  x: "M18 6 6 18M6 6l12 12",
  left: "m15 18-6-6 6-6",
  right: "m9 18 6-6-6-6",
  search: "M21 21l-4.3-4.3M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14z",
  trash: "M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M10 11v6M14 11v6",
  edit: "M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z",
  logout: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9",
  ban: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM4.9 4.9l14.2 14.2",
} as const;

export type IconName = keyof typeof P;

export function Icon({ name, size = 16 }: { name: IconName; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={P[name]} />
    </svg>
  );
}

const VARIANT = {
  primary: "bg-accent text-accent-fg hover:opacity-90 border-transparent",
  default: "bg-panel text-fg border-line hover:bg-panel2",
  danger: "bg-panel text-danger border-line hover:bg-danger-soft",
  ghost: "bg-transparent text-muted border-transparent hover:bg-panel2 hover:text-fg",
};
const SIZE = { sm: "h-7 px-2.5 text-xs gap-1", md: "h-9 px-3.5 text-sm gap-1.5" };

export type ButtonStyle = { variant?: keyof typeof VARIANT; size?: keyof typeof SIZE; className?: string };
export const btnCls = ({ variant = "default", size = "md", className = "" }: ButtonStyle = {}) =>
  `inline-flex items-center justify-center rounded-md border font-medium transition ${VARIANT[variant]} ${SIZE[size]} ${className}`;

type BtnProps = ButtonStyle & {
  children: ReactNode;
  icon?: IconName;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit";
  title?: string;
};

export function Button({ children, icon, onClick, disabled, type = "button", title, ...style }: BtnProps) {
  return (
    <button type={type} onClick={onClick} disabled={disabled} title={title} className={btnCls(style)}>
      {icon && <Icon name={icon} size={style.size === "sm" ? 13 : 15} />}
      {children}
    </button>
  );
}

export function LinkButton({
  href, children, icon, title, prefetch, ...style
}: ButtonStyle & { href: string; children: ReactNode; icon?: IconName; title?: string; prefetch?: boolean }) {
  return (
    <Link href={href} title={title} prefetch={prefetch} className={btnCls(style)}>
      {icon && <Icon name={icon} size={style.size === "sm" ? 13 : 15} />}
      {children}
    </Link>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-muted">{label}</span>
      {children}
    </label>
  );
}

export const inputCls =
  "h-9 w-full rounded-md border border-line bg-panel px-3 text-sm text-fg placeholder:text-muted/70 focus:border-accent";

export function Badge({ children, tone = "gray" }: { children: ReactNode; tone?: "gray" | "red" | "green" | "amber" | "indigo" }) {
  const t = {
    gray: "bg-panel2 text-muted border-line",
    red: "bg-danger-soft text-danger border-transparent",
    green: "bg-ok-soft text-ok border-transparent",
    amber: "bg-warn-soft text-warn border-transparent",
    indigo: "bg-accent-soft text-accent border-transparent",
  }[tone];
  return <span className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[11px] font-medium ${t}`}>{children}</span>;
}
