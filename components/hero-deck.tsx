'use client';
// Phones/tablets get a fanned deck of wallpapers on the home page instead of the drifting columns:
// it advances on its own, and can be swiped or tapped (a side card comes to the front).
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { clockTime, prefersReducedMotion } from '@/lib/client';
import type { PublicWallpaper } from '@/lib/types';

export default function HeroDeck({ items }: { items: PublicWallpaper[] }) {
  const n = items.length;
  const [i, setI] = useState(0);
  const [time, setTime] = useState('');
  const timer = useRef<number>(undefined);
  const x0 = useRef<number | null>(null);

  const restart = useCallback(() => {
    clearInterval(timer.current);
    if (!prefersReducedMotion()) timer.current = window.setInterval(() => setI((k) => (k + 1) % n), 3400);
  }, [n]);
  useEffect(() => {
    setTime(clockTime(new Date())); // set after mount so the server and browser agree
    restart();
    return () => clearInterval(timer.current);
  }, [restart]);

  if (!n) return null;
  const step = (d: number) => { setI((k) => (k + d + n) % n); restart(); };
  const pos = (k: number) => {
    const rel = (k - i + n) % n;
    return rel === 0 ? 'center' : rel === 1 ? 'right' : rel === n - 1 ? 'left' : 'back';
  };

  return (
    <div className="hero-deck"
      onTouchStart={(e) => { x0.current = e.touches[0].clientX; }}
      onTouchEnd={(e) => {
        if (x0.current === null) return;
        const dx = e.changedTouches[0].clientX - x0.current;
        x0.current = null;
        if (Math.abs(dx) > 40) step(dx < 0 ? 1 : -1);
      }}>
      <div className="deck-stage">
        {items.map((w, k) => (
          <Link key={w.id} className="deck-card" href={`/wallpaper/${w.id}`} data-pos={pos(k)} tabIndex={pos(k) === 'center' ? 0 : -1}
            aria-label={w.title}
            onClick={(e) => { if (pos(k) !== 'center') { e.preventDefault(); setI(k); restart(); } }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={w.display} alt="" draggable={false} />
            <span className="deck-island"></span>
            <span className="deck-time">{time}</span>
          </Link>
        ))}
      </div>
      <p className="deck-caption" aria-live="polite"><b>{items[i].title}</b><span>{items[i].category}</span></p>
      <div className="deck-dots">{items.map((w, k) => <i key={w.id} className={k === i ? 'on' : ''}></i>)}</div>
    </div>
  );
}
