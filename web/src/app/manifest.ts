import type { MetadataRoute } from "next";

// 홈 화면에 추가(PWA 북마크) 했을 때의 이름/아이콘/실행 방식
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "MWRC 출석부",
    short_name: "MWRC 출석부",
    description: "My Way Running Crew 운영진 출석 관리",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#090907",
    theme_color: "#090907",
    lang: "ko",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
