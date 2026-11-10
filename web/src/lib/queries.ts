import { cacheLife, cacheTag } from "next/cache";
import { mergedData } from "./data";
import type { MergedData } from "./types";

export const DATA_TAG = "att-data";

/**
 * 출석 데이터(자동수집 + 보정 병합). 사용자와 무관한 데이터라 캐시해서 공유한다.
 * 쓰기(서버 액션/크론) 후에는 DATA_TAG 를 무효화한다.
 */
export async function getData(): Promise<MergedData> {
  "use cache";
  cacheTag(DATA_TAG);
  cacheLife("minutes");
  return mergedData();
}
