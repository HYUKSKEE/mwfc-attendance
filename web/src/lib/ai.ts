import { getConfig } from "./config";
import { getJson, setJson } from "./store";
import { mergedData } from "./data";

// AI 도우미 이식 (Gemini 기본, OpenAI 호환 API 선택)

const DEFAULT_SYS =
  "너는 러닝크루 출석부 도우미야. 아래 제공된 '회원 명단'과 '정모(벙) 정보' " +
  "안에서만 사실을 찾아 한국어로 간결하게 답해. 데이터에 없으면 '데이터에 없어요'라고 해. " +
  "이름 일부로 물으면 해당하는 사람들을 모두 찾아줘. 날짜·참석자·횟수는 데이터 그대로 사용해.";
const USER_ERR = "에러났어요 죄송해요 🙏 잠시 후 다시 시도해 주세요.";

export function aiEnabled() {
  const c = getConfig().ai;
  return !!(c.geminiKey || c.apiKey);
}

function provider() {
  const c = getConfig().ai;
  if (c.provider) return c.provider;
  return c.apiKey ? "openai" : "gemini";
}

export async function aiSystemPrompt() {
  const v = await getJson<{ system_prompt?: string }>("ai_config", {});
  return v.system_prompt || DEFAULT_SYS;
}
export const setAiSystemPrompt = (t: string) => setJson("ai_config", { system_prompt: t });

export async function readAiErrors(limit = 50) {
  const l = await getJson<string[]>("ai_errors", []);
  return l.slice(-limit).join("");
}
export const clearAiErrors = () => setJson("ai_errors", []);

async function logAiError(detail: string, question: string) {
  try {
    const ts = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 19).replace("T", " ");
    const l = await getJson<string[]>("ai_errors", []);
    l.push(`[${ts}] q=${JSON.stringify(question.slice(0, 60))}\n    ${detail}\n`);
    await setJson("ai_errors", l.slice(-100));
  } catch { /* 로그 실패는 무시 */ }
}

async function buildContext() {
  const data = await mergedData();
  const lines = ["[회원 명단] 형식: 이름 | 가입일 | 마지막출석 | 누적참가"];
  for (const m of data.members) {
    if (m.banned) continue;
    lines.push(`${m.name} | ${m.joined_date || "?"} | ${m.last_attended ?? "기록없음"} | ${m.attend_count ?? 0}회`);
  }
  lines.push("", "[정모(벙) 정보] 형식: 벙날짜 | 제목 | 장소 | 참석자");
  for (const mt of data.meetups) {
    const e = mt.date ? String(mt.date) : "";
    const d = e ? `${e.slice(0, 4)}-${e.slice(4, 6)}-${e.slice(6, 8)}` : mt.date_str || "?";
    lines.push(`${d} | ${mt.title ?? ""} | ${mt.place ?? ""} | ${(mt.attendee_names ?? []).join(",")}`);
  }
  return lines.join("\n");
}

type AiRes = { ok: true; answer: string } | { ok: false; error: string };

async function callGemini(system: string, user: string): Promise<AiRes> {
  const c = getConfig().ai;
  if (!c.geminiKey) return { ok: false, error: "GEMINI_API_KEY 가 없습니다." };
  const r = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${c.geminiModel}:generateContent`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": c.geminiKey },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: system }] },
        contents: [{ parts: [{ text: user }] }],
        generationConfig: { temperature: 0.2 },
      }),
      signal: AbortSignal.timeout(40_000),
    },
  );
  const j = await r.json();
  if (!r.ok) return { ok: false, error: `Gemini ${r.status}: ${JSON.stringify(j)}` };
  return { ok: true, answer: j.candidates[0].content.parts[0].text };
}

async function callOpenAi(system: string, user: string): Promise<AiRes> {
  const c = getConfig().ai;
  if (!c.apiKey) return { ok: false, error: "AI_API_KEY 가 없습니다." };
  const r = await fetch(c.baseUrl.replace(/\/$/, "") + "/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + c.apiKey },
    body: JSON.stringify({
      model: c.model, temperature: 0.2,
      messages: [{ role: "system", content: system }, { role: "user", content: user }],
    }),
    signal: AbortSignal.timeout(40_000),
  });
  const j = await r.json();
  if (!r.ok) return { ok: false, error: `AI ${r.status}: ${JSON.stringify(j)}` };
  return { ok: true, answer: j.choices[0].message.content };
}

export async function callAi(question: string): Promise<AiRes> {
  let res: AiRes;
  try {
    const system = await aiSystemPrompt();
    const user = `${await buildContext()}\n\n[질문]\n${question}`;
    res = provider() === "gemini" ? await callGemini(system, user) : await callOpenAi(system, user);
  } catch (e) {
    res = { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
  if (!res.ok) {
    await logAiError(res.error, question);
    return { ok: false, error: USER_ERR };
  }
  return res;
}
