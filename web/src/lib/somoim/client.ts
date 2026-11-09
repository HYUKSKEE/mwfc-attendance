import { gunzipSync, inflateRawSync } from "node:zlib";

// 소모임 비공개 API 클라이언트 (somoim_attendance.py 의 post/decode_body 이식)
export const BASE = "https://sm-members.fcfc-1.com";
export const OFFSET = 1_000_000_000; // 소모임 시각값 = Unix시간 - 1e9

const HEADERS = {
  Accept: "application/json",
  "Content-Type": "application/json",
  "User-Agent":
    "Dalvik/2.1.0 (Linux; U; Android 9; SM-N976N Build/QP1A.190711.020)",
  "Accept-Encoding": "gzip",
};

export type SomoimCred = {
  PW: string;
  NID: string;
  MN: string;
  GID: string;
  MY_WID: string;
  G_T: number;
};

export function credFromEnv(): SomoimCred {
  const env = process.env;
  return {
    PW: env.SOMOIM_PW ?? "",
    NID: env.SOMOIM_NID ?? "",
    MN: env.SOMOIM_MN ?? "",
    GID: env.SOMOIM_GID ?? "",
    MY_WID: env.SOMOIM_MY_WID ?? "",
    G_T: Number(env.SOMOIM_G_T ?? 0),
  };
}

function decodeBody(raw: Buffer): unknown {
  // fetch 가 gzip 을 이미 풀어줬을 수도, 아닐 수도 있어 순서대로 시도
  const attempts: Array<() => Buffer> = [
    () => raw,
    () => {
      if (!(raw.length >= 2 && raw[0] === 0x1f && raw[1] === 0x8b)) {
        throw new Error("not gzip");
      }
      return gunzipSync(raw);
    },
    () => inflateRawSync(raw),
  ];
  for (const attempt of attempts) {
    try {
      return JSON.parse(attempt().toString("utf-8"));
    } catch {
      continue;
    }
  }
  throw new Error(`디코드 실패: ${raw.subarray(0, 8).toString("hex")}`);
}

export async function post<T = Record<string, unknown>>(
  path: string,
  body: unknown,
  timeoutMs = 20_000,
): Promise<{ status: number; data: T }> {
  const r = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: HEADERS,
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
    cache: "no-store",
  });
  const raw = Buffer.from(await r.arrayBuffer());
  return { status: r.status, data: decodeBody(raw) as T };
}

type SyncGiResponse = {
  res?: number;
  m?: Array<Record<string, unknown>>;
  g?: Record<string, unknown>;
};

/** sync_gi: 그룹 정보 + 회원 명단 */
export function syncGi(cred: SomoimCred) {
  const body = {
    ver: 633,
    os: "01",
    pw: cred.PW,
    it: "180000",
    gid: cred.GID,
    ig: "Y",
    nid: cred.NID,
    cache: "N",
    ips: "N",
    cp: "Y",
  };
  return post<SyncGiResponse>(`/group_infos/sync_gi/${cred.MY_WID}.json`, body);
}
