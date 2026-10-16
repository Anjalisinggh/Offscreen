'use client';
import { useLayoutEffect, useState } from 'react';
import { fmt, prefersReducedMotion } from '@/lib/client';

// counts from 0 up to `value` once, easing out over 0.9s. The page itself carries the real number
// (for search engines and link previews); the count starts before the browser first paints it.
export default function CountUp({ value }: { value: number }) {
  const [n, setN] = useState(value);
  useLayoutEffect(() => {
    if (prefersReducedMotion() || !value) { setN(value); return; }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / 900);
      setN(Math.round(value * (1 - Math.pow(1 - p, 4))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    setN(0);
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <>{fmt(n)}</>;
}
