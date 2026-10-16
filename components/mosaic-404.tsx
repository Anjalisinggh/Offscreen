'use client';
// The "404" on the not-found page, drawn in tiny square crops of real wallpapers. The squares pop
// in one by one, then every so often one of them quietly turns into a different wallpaper; each
// square is a link to the wallpaper it shows.
import Link from 'next/link';
import { useEffect, useState, type CSSProperties } from 'react';
import { prefersReducedMotion, wallpaperPath } from '@/lib/client';

export interface MosaicTile { id: number; title: string; src: string }

// each digit on a 5 × 7 grid
const DIGITS: Record<string, string[]> = {
  '4': ['...#.', '..##.', '.#.#.', '#..#.', '#####', '...#.', '...#.'],
  '0': ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
};
// every lit square of "4 0 4", left to right, with one empty column between digits
const CELLS = '404'.split('').flatMap((d, k) =>
  DIGITS[d].flatMap((row, y) => [...row].flatMap((c, x) => (c === '#' ? [{ col: k * 6 + x + 1, row: y + 1 }] : []))));

// a fixed shuffle, so the order the squares pop in is the same for the server and the browser
const ORDER = CELLS.map((_, i) => ((i * 29) % CELLS.length) / CELLS.length);

export default function Mosaic404({ pool }: { pool: MosaicTile[] }) {
  const [shown, setShown] = useState(() => CELLS.map((_, i) => pool[i % pool.length]));

  useEffect(() => {
    if (pool.length <= CELLS.length || prefersReducedMotion()) return;
    const t = setInterval(() => {
      setShown((now) => {
        const onScreen = new Set(now.map((w) => w.id));
        const spare = pool.filter((w) => !onScreen.has(w.id));
        if (!spare.length) return now;
        const next = [...now];
        next[Math.floor(Math.random() * next.length)] = spare[Math.floor(Math.random() * spare.length)];
        return next;
      });
    }, 900);
    return () => clearInterval(t);
  }, [pool]);

  return (
    <div className="mosaic" role="img" aria-label="404">
      {CELLS.map((cell, i) => {
        const w = shown[i];
        return (
          <Link key={i} className="mosaic-tile" href={wallpaperPath(w)} title={w.title} tabIndex={-1}
            style={{ gridColumn: cell.col, gridRow: cell.row, '--d': `${(ORDER[i] * 0.9).toFixed(2)}s` } as CSSProperties}>
            {/* keyed by wallpaper, so a newly arrived one fades in over the old */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img key={w.id} src={w.src} alt="" draggable={false} />
          </Link>
        );
      })}
    </div>
  );
}
