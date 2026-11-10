"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Icon } from "./ui";

// Android/Chrome 의 설치 프롬프트 이벤트 (표준 타입에 없음)
type InstallPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

const KEY = "install_banner_dismissed";
const noop = () => () => {};

/** 이미 홈 화면 앱으로 열었는지 */
const isStandalone = () =>
  window.matchMedia("(display-mode: standalone)").matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;

function readDismissed() {
  try { return localStorage.getItem(KEY) === "1"; } catch { return false; }
}

/**
 * 폰 전용 "홈 화면에 추가" 배너.
 * - Android/Chrome: 설치 창을 바로 띄움
 * - iPhone/Safari: 웹에서 직접 추가는 불가 → 공유 창을 열어 '홈 화면에 추가' 선택을 유도
 */
export default function InstallBanner() {
  const mounted = useSyncExternalStore(noop, () => true, () => false);
  const [dismissed, setDismissed] = useState(readDismissedOnce);
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);
  const [help, setHelp] = useState(false);

  useEffect(() => {
    const onPrompt = (e: Event) => { e.preventDefault(); setPrompt(e as InstallPrompt); };
    const onInstalled = () => { setPrompt(null); close(); };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  });

  function close() {
    try { localStorage.setItem(KEY, "1"); } catch { /* 저장 불가 환경 */ }
    setDismissed(true);
  }

  if (!mounted || dismissed || isStandalone()) return null;

  const add = async () => {
    if (prompt) {
      await prompt.prompt();
      const { outcome } = await prompt.userChoice;
      setPrompt(null);
      if (outcome === "accepted") close();
      return;
    }
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: "MWRC 출석부", url: location.origin });
        setHelp(true); // 공유 창을 닫은 뒤에도 다음 단계를 보여줌
      } catch { /* 사용자가 공유 창을 닫음 */ }
      return;
    }
    setHelp(true);
  };

  return (
    <div className="mb-4 rounded-lg border border-line bg-panel px-4 py-3 md:hidden">
      <div className="flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-m.png" alt="" width={36} height={36} className="h-9 w-9 shrink-0 rounded-lg" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">홈 화면에 추가</p>
          <p className="text-xs text-muted">앱처럼 바로 열 수 있어요</p>
        </div>
        <button onClick={add}
          className="h-8 shrink-0 rounded-md bg-accent px-3 text-xs font-medium text-accent-fg hover:opacity-90">추가</button>
        <button onClick={close} aria-label="닫기" className="shrink-0 rounded p-1 text-muted hover:bg-panel2">
          <Icon name="x" size={16} />
        </button>
      </div>
      {help && (
        <p className="mt-3 rounded-md bg-panel2 px-3 py-2 text-xs leading-relaxed text-muted">
          공유 창 목록에서 <b className="text-fg">홈 화면에 추가</b>를 누르고, 오른쪽 위 <b className="text-fg">추가</b>를 눌러 주세요.
          목록에 없으면 맨 아래 <b className="text-fg">더 보기</b>를 확인하세요.
        </p>
      )}
    </div>
  );
}

// useState 초기값: 서버에서는 false, 브라우저에서는 저장된 값
function readDismissedOnce() {
  return typeof window === "undefined" ? false : readDismissed();
}
