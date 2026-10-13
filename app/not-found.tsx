// The 404 page: a full-screen blossom scene (public/404-bg.webp) with a few petals drifting over
// it and two ways back into the gallery. It covers the usual top bar and footer.
import Link from 'next/link';
import { wallpaperIds } from '@/lib/wallpapers';
import { SurpriseButton, ThemeButton } from '@/components/not-found-actions';

export const metadata = { title: 'Page not found · Offscreen' };

// the drifting petals: the same scatter on every visit, spread by a small seeded generator
const PETALS = (() => {
  let seed = 404;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  return Array.from({ length: 14 }, (_, i) => {
    const depth = rnd(); // 0 far (small, sharp) → 1 near (large, soft)
    return {
      left: rnd() * 100, top: rnd() * 70,
      size: 10 + depth * depth * 30,
      blur: depth > .75 ? (depth - .75) * 20 : 0,
      turn: rnd() * 360, dur: 7 + rnd() * 9, delay: -rnd() * 12,
      alt: i % 3,
    };
  });
})();

export default function NotFound() {
  return (
    <div className="nf404">
      <div className="nf404-scene" aria-hidden="true">
        {PETALS.map((p, i) => (
          <span key={i} className={`nf404-petal a${p.alt}`} style={{
            left: `${p.left.toFixed(1)}%`, top: `${p.top.toFixed(1)}%`, width: Math.round(p.size), height: Math.round(p.size * 1.25),
            filter: p.blur ? `blur(${p.blur.toFixed(1)}px)` : undefined,
            animationDuration: `${p.dur.toFixed(1)}s`, animationDelay: `${p.delay.toFixed(1)}s`,
            '--turn': `${p.turn.toFixed(0)}deg`,
          } as React.CSSProperties} />
        ))}
      </div>

      <ThemeButton />

      <div className="nf404-copy">
        <h1>You wandered <em>offscreen.</em></h1>
        <p>This page doesn’t exist, but something beautiful might.</p>
        <div className="nf404-actions">
          <Link className="nf404-btn solid" href="/explore">Explore wallpapers <span aria-hidden="true">↗</span></Link>
          <SurpriseButton ids={wallpaperIds} />
        </div>
        <span className="nf404-code">404 — Lost in a prettier place</span>
      </div>
    </div>
  );
}
