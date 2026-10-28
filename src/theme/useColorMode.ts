import { useEffect, useState } from 'react';
export type Mode = 'light' | 'dark' | 'system';
const KEY = 'taskboard.mode';
const read = (): Mode => { try { return (localStorage.getItem(KEY) as Mode) || 'light'; } catch { return 'light'; } };

export function useColorMode() {
  const [mode, setMode] = useState<Mode>(read);
  const [sys, setSys] = useState(() => matchMedia('(prefers-color-scheme: dark)').matches);
  useEffect(() => {
    const mq = matchMedia('(prefers-color-scheme: dark)');
    const fn = (e: MediaQueryListEvent) => setSys(e.matches);
    mq.addEventListener('change', fn);
    return () => mq.removeEventListener('change', fn);
  }, []);
  const resolved = mode === 'system' ? (sys ? 'dark' : 'light') : mode;
  useEffect(() => {
    document.documentElement.dataset.theme = resolved;
    try { localStorage.setItem(KEY, mode); } catch { /* storage may be unavailable */ }
  }, [mode, resolved]);
  return { mode, resolved, setMode };
}
