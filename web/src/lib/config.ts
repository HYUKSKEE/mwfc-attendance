// 설정은 모두 환경변수. (기존 cred.json 의 필드와 1:1 대응)
function list(v: string | undefined, def: string[]): string[] {
  if (v === undefined || v.trim() === "") return def;
  return v
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function getConfig() {
  const e = process.env;
  return {
    webPassword: (e.WEB_PASSWORD ?? "").trim(),
    adminPassword: (e.ADMIN_PASSWORD ?? "").trim(),
    pacerPassword: (e.PACER_PASSWORD ?? "").trim(),
    ownerName: e.OWNER_NAME || "kkjjhh(계정주)",
    ownerJoined: Number(e.OWNER_JOINED ?? 0) || 0,
    excludeKeywords: list(e.EXCLUDE_KEYWORDS, ["풋살"]),
    eventCats: (e.EVENT_CATS ?? "E").trim().toLowerCase() === "all"
      ? null
      : new Set(list(e.EVENT_CATS, ["E"])),
    introMaxCheck: Number(e.INTRO_MAX_CHECK ?? 10) || 10,
    // 자동수집 기간(일): 30~180
    autoCollectDays: Math.max(30, Math.min(180, Number(e.AUTO_COLLECT_DAYS ?? 180) || 180)),
    ai: {
      provider: (e.AI_PROVIDER ?? "").trim().toLowerCase(),
      geminiKey: (e.GEMINI_API_KEY ?? "").trim(),
      geminiModel: (e.GEMINI_MODEL ?? "gemini-3.8-flash").trim(),
      apiKey: (e.AI_API_KEY ?? "").trim(),
      baseUrl: (e.AI_BASE_URL ?? "https://api.groq.com/openai/v1").trim(),
      model: (e.AI_MODEL ?? "llama-3.3-70b-versatile").trim(),
    },
  };
}
