# 소모임 러닝크루 출석부 (Next.js)

`somoim_attendance_tools`(Python + 바닐라 HTML)를 이전한 버전.

```bash
npm install
npm run dev   # http://localhost:3000
```

- 화면: `public/attendance.html` (기존 UI 그대로, `/` 로 서빙)
- API: `src/app/api/*` (기존 로컬 서버 엔드포인트 이식), 수집 로직: `src/lib/somoim/`
- 저장: 배포는 Upstash Redis, 로컬은 `.data/*.json` (Redis env 없을 때)
- 설정: `.env.example` 참고 (기존 cred.json 필드 → 환경변수)
- 자동수집: `vercel.json` 크론이 `/api/cron/collect` 호출 (`CRON_SECRET` 필요)
- 로그인: 토큰은 서명 방식. 배포 환경에서 `WEB_PASSWORD`/`ADMIN_PASSWORD` 가 없으면 전부 차단
