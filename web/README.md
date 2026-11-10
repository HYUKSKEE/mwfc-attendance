# 출석 관리 (소모임 러닝크루)

소모임 러닝크루 운영진용 출석 관리 화면. `somoim_attendance_tools`(Python)를 Next.js 로 이전.

```bash
npm install
npm run dev   # http://localhost:3000
```

## 기능
- **캘린더**: 월간 달력에 벙 표시 → 벙 선택 시 참석자 확인, 인원 추가/제거, 벙 수정/취소/삭제, 벙 추가
- **출석표 뽑기**: 최근 7~180일 벙 × 회원 엑셀(.xlsx)
- **회원**: 가입일 / 마지막 참가 / 참가 횟수
- **데이터 가져오기**: 소모임에서 회원·벙 수집 (매일 크론으로도 자동 수집)

## 구조 (Next.js App Router)
| 위치 | 역할 |
|---|---|
| `src/app/(admin)/` | 로그인 후 화면. 서버 컴포넌트가 데이터를 직접 읽음 (`?month=&meetup=&modal=` 로 상태 관리) |
| `src/app/actions.ts` | 서버 액션 (로그인, 참석자/벙 수정, 수집). 끝나면 `updateTag` 로 캐시 갱신 |
| `src/lib/queries.ts` | `'use cache'` + `cacheTag` 로 데이터 캐시 |
| `src/components/` | 서버 컴포넌트(캘린더·패널) + 클라이언트 컴포넌트(참석자 편집 `useOptimistic`, 모달) |
| `src/lib/somoim/` | 소모임 비공개 API 수집 로직 |
| `src/app/api/` | 엑셀 다운로드, 크론 수집 (그 외 `notes`/`ai`/`place_buckets`/`member_intro` 는 이전 기능용 API 로 보존) |

## 설정 / 배포
- 환경변수는 `.env.example` 참고. 배포 시 `ADMIN_PASSWORD` 또는 `WEB_PASSWORD` 필수(없으면 전부 차단)
- 저장소: 배포는 Upstash Redis(`KV_REST_API_URL/TOKEN`), 로컬은 `.data/*.json`
- 로그인은 httpOnly 쿠키(서명 토큰, 30일). 관리자 비번 = 수정 가능, 일반 비번 = 보기 전용
- 자동수집: `vercel.json` 크론 → `/api/cron/collect` (`CRON_SECRET` 필요)
