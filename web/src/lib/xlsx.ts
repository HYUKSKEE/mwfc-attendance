import ExcelJS from "exceljs";
import { loadNotes, mergedData } from "./data";
import type { Member, Note } from "./types";

// build_xlsx_bytes 이식

function dispName(m: Member, nt: Note | undefined, introName?: string) {
  const nick = (nt?.nick ?? "").trim();
  if (nick) return nick;
  const iname = (introName ?? "").trim();
  if (iname && iname !== m.name) return `${iname}(${m.name})`;
  return m.name;
}

function parseDate(ds: string | undefined): Date | null {
  const m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(ds ?? "");
  return m ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])) : null;
}

function gradHex(days: number | null, risk: number): string {
  const g = [163, 190, 140], y = [235, 203, 139], r = [191, 97, 106];
  if (days === null) return "BF616A";
  if (days <= 0) return "A3BE8C";
  let t: number, a: number[], b: number[];
  if (days <= risk) { t = days / risk; a = g; b = y; }
  else { t = Math.min((days - risk) / Math.max(risk, 1), 1); a = y; b = r; }
  return [0, 1, 2]
    .map((i) => Math.round(a[i] + (b[i] - a[i]) * t).toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
}

export async function buildXlsx(opts: { tags: boolean; memo: boolean; risk: number }) {
  const risk = Math.max(1, Math.trunc(opts.risk) || 30);
  const data = await mergedData();
  const notes = await loadNotes();
  const members = data.members.filter((m) => !m.banned);

  const hist = new Map<string, string[]>();
  for (const mt of data.meetups) { // 이미 최신순
    if (mt.cancelled) continue;
    const label = `${mt.date_str || mt.date || ""} ${mt.title ?? ""}`.trim();
    for (const nm of mt.attendee_names ?? []) {
      if (!hist.has(nm)) hist.set(nm, []);
      hist.get(nm)!.push(label);
    }
  }

  members.sort((a, b) =>
    (b.last_attended ?? "").localeCompare(a.last_attended ?? "") ||
    (b.attend_count ?? 0) - (a.attend_count ?? 0));

  const today = new Date();
  const todayUtc = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  const daysOf = (m: Member) => {
    const d = parseDate(m.last_attended);
    return d ? Math.round((todayUtc - d.getTime()) / 86400000) : null;
  };

  type Col = { h: string; w: number; wrap?: boolean; v: (m: Member, nt: Note | undefined) => unknown };
  const cols: Col[] = [
    { h: "이름", w: 16, v: (m, nt) => dispName(m, nt) },
    { h: "가입일", w: 12, v: (m) => m.joined_date || "" },
    { h: "마지막 참가일", w: 14, v: (m) => parseDate(m.last_attended) },
    { h: "미참석 일수", w: 11, v: (m) => daysOf(m) },
    { h: "참가 횟수", w: 9, v: (m) => m.attend_count ?? 0 },
    { h: "노쇼", w: 7, v: (_m, nt) => nt?.noshow ?? 0 },
    { h: "지각", w: 7, v: (_m, nt) => nt?.late ?? 0 },
    { h: "역할", w: 12, v: (_m, nt) =>
      (nt?.roles ?? []).map((r) => (r === "admin" ? "운영진" : r === "pacer" ? "페이서" : r)).join(" ") },
  ];
  if (opts.tags) cols.push({ h: "태그", w: 18, wrap: true, v: (_m, nt) => (nt?.tags ?? []).join(", ") });
  if (opts.memo) cols.push({ h: "메모", w: 30, wrap: true, v: (_m, nt) => nt?.memo ?? "" });
  cols.push({ h: "벙 참가 이력", w: 60, wrap: true, v: (m) => (hist.get(m.name) ?? []).join(" / ") });

  const idxLast = cols.findIndex((c) => c.h === "마지막 참가일") + 1;
  const idxDays = cols.findIndex((c) => c.h === "미참석 일수") + 1;

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("회원 출석");
  ws.columns = cols.map((c) => ({ header: c.h, width: c.w }));
  const border = Object.fromEntries(
    ["left", "right", "top", "bottom"].map((s) => [s, { style: "thin", color: { argb: "FFD8DEE9" } }]),
  ) as Partial<ExcelJS.Borders>;

  const head = ws.getRow(1);
  head.eachCell((c) => {
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF2E3440" } };
    c.font = { color: { argb: "FFFFFFFF" }, bold: true };
    c.alignment = { horizontal: "center", vertical: "middle" };
    c.border = border;
  });

  for (const m of members) {
    const nt = notes[m.mid];
    const row = ws.addRow(cols.map((c) => {
      const v = c.v(m, nt);
      return v === null || v === undefined ? "" : v;
    }));
    row.eachCell({ includeEmpty: true }, (c, n) => {
      c.border = border;
      c.alignment =
        n === idxLast || n === idxDays
          ? { vertical: "middle", horizontal: "center" }
          : { vertical: "middle", wrapText: !!cols[n - 1]?.wrap };
    });
    const last = row.getCell(idxLast);
    if (last.value instanceof Date) last.numFmt = "yyyy-mm-dd";
    last.fill = {
      type: "pattern", pattern: "solid",
      fgColor: { argb: "FF" + gradHex(daysOf(m), risk) },
    };
  }

  if (ws.rowCount >= 2) {
    const letter = ws.getColumn(idxDays).letter;
    ws.addConditionalFormatting({
      ref: `${letter}2:${letter}${ws.rowCount}`,
      rules: [{
        type: "colorScale", priority: 1,
        cfvo: [
          { type: "num", value: 0 },
          { type: "num", value: risk },
          { type: "num", value: risk * 2 },
        ],
        color: [{ argb: "FFA3BE8C" }, { argb: "FFEBCB8B" }, { argb: "FFBF616A" }],
      }],
    });
  }
  ws.views = [{ state: "frozen", ySplit: 1 }];

  const buf = Buffer.from(await wb.xlsx.writeBuffer());
  return { buf, count: members.length };
}
