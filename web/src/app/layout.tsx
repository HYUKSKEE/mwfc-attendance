import type { Metadata, Viewport } from "next";
import "./globals.css";

// 배포 도메인(OG 이미지 절대경로용). Vercel 이 자동으로 주입하는 값을 사용
const site = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : "http://localhost:3000";

const TITLE = "MWRC 출석부";
const DESC = "My Way Running Crew 운영진 출석 관리";

// 아이콘/OG 이미지는 src/app 의 icon.png, apple-icon.png, opengraph-image.png, twitter-image.png 파일 규칙으로 자동 등록
export const metadata: Metadata = {
  metadataBase: new URL(site),
  title: { default: TITLE, template: "%s · MWRC 출석부" },
  description: DESC,
  applicationName: TITLE,
  // iOS 홈 화면 추가 시 표시되는 이름(아이콘은 apple-icon.png)
  appleWebApp: { capable: true, title: TITLE, statusBarStyle: "black" },
  robots: { index: false, follow: false }, // 운영진 전용: 검색 노출 안 함 (메신저 링크 미리보기는 정상 동작)
  openGraph: { title: TITLE, description: DESC, siteName: "MWRC", locale: "ko_KR", type: "website" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESC },
};

export const viewport: Viewport = {
  themeColor: "#090907", // 로고 배경색: 모바일 브라우저 상단바 색
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
