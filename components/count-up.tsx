'use client';
import { useEffect, useState } from 'react';
import { fmt, prefersReducedMotion } from '@/lib/client';

// counts from 0 up to `value` once, easing out over 1.4s
export default function CountUp({ value }: { value: number }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (prefersReducedMotion() || !value) { setN(value); return; }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / 1400);
      setN(Math.round(value * (1 - Math.pow(1 - p, 4))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <>{fmt(n)}</>;
}
