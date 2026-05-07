import { useEffect, useState } from 'react';

/**
 * "마지막으로 본 시각" 저장. localStorage에 ms epoch 문자열로 저장.
 * 초기 방문이면 NOW로 초기화 (옛 글들이 "새 글"로 잡히지 않도록).
 *
 * NewPostBanner 등 미열람 카운트 계산에 사용.
 */
const KEY = 'linenb-last-seen';

function read(): number {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return 0;
    const n = Number(raw);
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}

function write(ms: number) {
  try {
    window.localStorage.setItem(KEY, String(ms));
  } catch {
    /* private mode 등 무시 */
  }
}

export function useLastSeen(): [number, () => void] {
  const [lastSeen, setLastSeen] = useState<number>(() => {
    const stored = read();
    if (stored > 0) return stored;
    const now = Date.now();
    write(now);
    return now;
  });

  // 다른 탭에서 갱신 시 동기화 (옵션이지만 저렴)
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY && e.newValue) {
        const n = Number(e.newValue);
        if (Number.isFinite(n)) setLastSeen(n);
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const markSeen = () => {
    const now = Date.now();
    write(now);
    setLastSeen(now);
  };

  return [lastSeen, markSeen];
}
