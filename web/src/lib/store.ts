import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { Redis } from "@upstash/redis";

// 영속 저장소. 배포(Vercel)에서는 Upstash Redis, 로컬에서 Redis 설정이 없으면 .data/*.json 파일.
// (Vercel Marketplace 의 Upstash 는 KV_REST_API_* 이름으로 env 를 주입한다)

const REDIS_URL =
  process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL ?? "";
const REDIS_TOKEN =
  process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN ?? "";

let redis: Redis | null = null;
function getRedis(): Redis | null {
  if (!REDIS_URL || !REDIS_TOKEN) return null;
  redis ??= new Redis({ url: REDIS_URL, token: REDIS_TOKEN });
  return redis;
}

const DATA_DIR = path.join(process.cwd(), ".data");
const PREFIX = "att:";

function fileOf(key: string) {
  return path.join(DATA_DIR, key.replace(/[^\w.-]/g, "_") + ".json");
}

function assertStore() {
  if (!getRedis() && process.env.VERCEL) {
    throw new Error(
      "저장소가 없습니다. Vercel 프로젝트에 Upstash Redis 를 연결하세요 (KV_REST_API_URL / KV_REST_API_TOKEN).",
    );
  }
}

export async function getJson<T>(key: string, def: T): Promise<T> {
  assertStore();
  const r = getRedis();
  if (r) {
    const v = await r.get<T>(PREFIX + key);
    return v ?? def;
  }
  try {
    return JSON.parse(await readFile(fileOf(key), "utf-8")) as T;
  } catch {
    return def;
  }
}

export async function setJson(key: string, value: unknown): Promise<void> {
  assertStore();
  const r = getRedis();
  if (r) {
    await r.set(PREFIX + key, value);
    return;
  }
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(fileOf(key), JSON.stringify(value, null, 2), "utf-8");
}

/** 중복 실행 방지용 락. 얻으면 true. (로컬 파일 모드는 항상 true) */
export async function acquireLock(key: string, ttlSec: number): Promise<boolean> {
  const r = getRedis();
  if (!r) return true;
  const ok = await r.set(PREFIX + "lock:" + key, "1", { nx: true, ex: ttlSec });
  return ok === "OK";
}

export async function releaseLock(key: string): Promise<void> {
  const r = getRedis();
  if (r) await r.del(PREFIX + "lock:" + key);
}
