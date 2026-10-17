'use client';
// Masonry columns, built in JS instead of CSS `columns`: CSS column-balancing fills a whole
// column before moving to the next, so a run of tall phone cards next to a run of short, wide
// desktop cards leaves one side visibly shorter than the other. Here every card goes into
// whichever column is currently shortest (by estimated height, from its own aspect ratio),
// which keeps the columns level regardless of the mix of shapes.
import { useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { PublicWallpaper } from '@/lib/types';
import Card from './card';

function columnCountFor(width: number) {
  if (width < 640) return 2;
  return Math.max(1, Math.min(4, Math.floor((width + 22) / (230 + 22))));
}
const estCardHeight = (w: PublicWallpaper, colWidth: number) =>
  colWidth / ((w.width && w.height) ? w.width / w.height : 9 / 16) + 84; // + title/meta block

// an extra tile placed among the wallpapers (the sponsor tile), after `at` cards; `est` is its rough
// height in pixels, for levelling the columns
type Slot = { at: number; node: ReactNode; est: number };
type Entry = { w: PublicWallpaper; i: number } | { slot: ReactNode; est: number; i: number };

export default function Grid({ items, empty, slot }: { items: PublicWallpaper[]; empty?: ReactNode; slot?: Slot }) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const hasItems = items.length > 0;

  // the columns depend on the grid's own width, so they're laid out once it's measured
  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;
    const measure = () => setWidth(node.clientWidth || node.parentElement?.clientWidth || 320);
    measure();
    let t: number;
    const ro = new ResizeObserver(() => { clearTimeout(t); t = window.setTimeout(measure, 120); });
    ro.observe(node);
    return () => { ro.disconnect(); clearTimeout(t); };
  }, [hasItems]);

  const mobile = width < 640;
  const gap = mobile ? 12 : 22;
  // the wallpapers, with the extra tile (if any) slotted in after `slot.at` of them
  const entries = useMemo(() => {
    const out: Entry[] = items.map((w, i) => ({ w, i }));
    if (slot && items.length) out.splice(Math.min(slot.at, items.length), 0, { slot: slot.node, est: slot.est, i: Math.min(slot.at, items.length) });
    return out;
  }, [items, slot]);
  const render = (e: Entry) => ('w' in e ? <Card key={e.w.id} w={e.w} i={e.i} /> : <div key="slot" className="grid-slot">{e.slot}</div>);

  const columns = useMemo(() => {
    if (!width) return [];
    const cols = columnCountFor(width);
    const colWidth = (width - gap * (cols - 1)) / cols;
    const heights = new Array(cols).fill(0);
    const out: Entry[][] = Array.from({ length: cols }, () => []);
    entries.forEach((e) => {
      const target = heights.indexOf(Math.min(...heights));
      out[target].push(e);
      heights[target] += ('w' in e ? estCardHeight(e.w, colWidth) : e.est) + (mobile ? 22 : 40);
    });
    return out;
  }, [entries, width, gap, mobile]);

  if (!hasItems) return <div className="grid">{empty}</div>;
  // before the width is known (the server's HTML, and the first paint), every card is still put out,
  // in plain CSS columns: crawlers that don't run JavaScript see the wallpapers and their links, and
  // the cards are hidden until they reveal anyway, by which time the measured columns have replaced it
  if (!width) {
    return (
      <div className="grid grid-flow" ref={ref}>
        {entries.map(render)}
      </div>
    );
  }
  return (
    <div className="grid" ref={ref} style={{ display: 'flex', gap, alignItems: 'flex-start' }}>
      {columns.map((col, c) => (
        <div className="grid-col" key={c}>
          {col.map(render)}
        </div>
      ))}
    </div>
  );
}
