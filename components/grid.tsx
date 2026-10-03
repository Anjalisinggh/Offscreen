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

export default function Grid({ items, empty }: { items: PublicWallpaper[]; empty?: ReactNode }) {
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
  const columns = useMemo(() => {
    if (!width) return [];
    const cols = columnCountFor(width);
    const colWidth = (width - gap * (cols - 1)) / cols;
    const heights = new Array(cols).fill(0);
    const out: { w: PublicWallpaper; i: number }[][] = Array.from({ length: cols }, () => []);
    items.forEach((w, i) => {
      const target = heights.indexOf(Math.min(...heights));
      out[target].push({ w, i });
      heights[target] += estCardHeight(w, colWidth) + (mobile ? 22 : 40);
    });
    return out;
  }, [items, width, gap, mobile]);

  if (!hasItems) return <div className="grid">{empty}</div>;
  return (
    <div className="grid" ref={ref} style={{ display: 'flex', gap, alignItems: 'flex-start' }}>
      {columns.map((col, c) => (
        <div className="grid-col" key={c}>
          {col.map(({ w, i }) => <Card key={w.id} w={w} i={i} />)}
        </div>
      ))}
    </div>
  );
}
