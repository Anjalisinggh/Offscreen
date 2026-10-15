// The wallpaper library: committed content in data/wallpapers.json and data/categories.json,
// with live like/download counts from the database added on top.
import 'server-only';
import wallpapersJson from '@/data/wallpapers.json';
import categoriesJson from '@/data/categories.json';
import { store } from './store';
import { thumbUrl, displayUrl, tileUrl } from './media';
import type { Wallpaper, PublicWallpaper, Category } from './types';

const WALLPAPERS = wallpapersJson as Wallpaper[];
export const categories: Category[] = categoriesJson;

export const findWallpaper = (id: number) => WALLPAPERS.find((w) => w.id === id);

// the squares that draw "404" on the not-found page: every wallpaper, in a fixed mixed-up order
// (phone/desktop pairs once), so neighbouring squares rarely look alike
export const mosaicTiles = () => dedupeSeries(WALLPAPERS.filter((w) => w.publicId))
  .map((w, i) => ({ w, k: (i * 37) % 101 })).sort((a, b) => a.k - b.k)
  .map(({ w }) => ({ id: w.id, title: w.title, src: tileUrl(w) }));

type Counts = Awaited<ReturnType<typeof store.counts>>;
const API_URL = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '');
let cached: { at: number; counts: Promise<Counts> } | undefined;

// Where the pages run without the database (Cloudflare), the totals come from the API server,
// kept for a minute; if it can't be reached the pages still show, with the starting totals.
function counts(): Promise<Counts> {
  if (process.env.DATABASE_URL || !API_URL) return store.counts();
  if (!cached || Date.now() - cached.at > 60_000) {
    const empty: Counts = { likes: {}, downloads: {} };
    const p = fetch(`${API_URL}/api/counts`, { signal: AbortSignal.timeout(3000) })
      .then((r) => (r.ok ? (r.json() as Promise<Counts>) : empty))
      .catch(() => { cached = undefined; return empty; });
    cached = { at: Date.now(), counts: p };
  }
  return cached.counts;
}

// the likes/downloads numbers in wallpapers.json are just the starting totals; what people
// actually do is added on top of them
export async function loadWallpapers(): Promise<Wallpaper[]> {
  const c = await counts();
  return WALLPAPERS.map((w) => ({ ...w, likes: (w.likes || 0) + (c.likes[w.id] || 0), downloads: (w.downloads || 0) + (c.downloads[w.id] || 0) }));
}

export function publicWallpaper(w: Wallpaper): PublicWallpaper {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { source, publicId, filename, ...rest } = w;
  return { ...rest, thumb: thumbUrl(w), display: displayUrl(w) };
}

// collapses phone/desktop crops of the same artwork to one result
export function dedupeSeries<T extends { series?: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  return items.filter((w) => !w.series || (!seen.has(w.series) && !!seen.add(w.series)));
}

export type Sort = 'trending' | 'popular' | 'downloads' | 'new' | 'featured' | '';
export function sortWallpapers<T extends PublicWallpaper | Wallpaper>(items: T[], sort: string): T[] {
  if (sort === 'trending') {
    // activity weighted toward recently added wallpapers
    const score = (w: T) => (w.likes * 2 + w.downloads) / Math.pow((Date.now() - new Date(w.createdAt).getTime()) / 86400000 + 2, 0.8);
    return [...items].sort((a, b) => score(b) - score(a));
  }
  if (sort === 'popular') return [...items].sort((a, b) => b.likes - a.likes);
  // most downloaded first; likes settle a tie
  if (sort === 'downloads') return [...items].sort((a, b) => b.downloads - a.downloads || b.likes - a.likes);
  if (sort === 'new') return [...items].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  if (sort === 'featured') return items.filter((w) => w.featured);
  return items;
}

export function filterWallpapers<T extends PublicWallpaper>(items: T[], { category, q, device }: { category?: string; q?: string; device?: string }) {
  let out = items;
  if (device === 'phone' || device === 'desktop') out = out.filter((w) => w.device === device);
  if (category && category !== 'All') out = out.filter((w) => w.category.toLowerCase() === category.toLowerCase());
  if (q) {
    const needle = q.toLowerCase();
    out = out.filter((w) =>
      w.title.toLowerCase().includes(needle) ||
      w.category.toLowerCase().includes(needle) ||
      w.tags.some((t) => t.toLowerCase().includes(needle)));
  }
  return out;
}

// ranked by shared category/tags, kept to the same device (phone vs desktop) where possible
export function similarTo(item: Wallpaper, items: Wallpaper[]): Wallpaper[] {
  const score = (w: Wallpaper) =>
    (w.category === item.category ? 3 : 0) +
    w.tags.filter((t) => item.tags.includes(t) && t !== w.device).length +
    (w.device === item.device ? 4 : 0);
  // never recommend a phone/desktop crop of the wallpaper someone is already looking at,
  // and never two crops of some other wallpaper alongside each other either
  return dedupeSeries(items
    .filter((w) => w.id !== item.id && !(item.series && w.series === item.series))
    .map((w) => ({ w, s: score(w) }))
    .filter((x) => x.s > 4)
    .sort((a, b) => b.s - a.s)
    .map((x) => x.w))
    .slice(0, 8);
}

// keeps the order the ids came in (most recent first)
export async function wallpapersByIds(ids: number[]): Promise<PublicWallpaper[]> {
  const byId = new Map((await loadWallpapers()).map((w) => [w.id, w]));
  return ids.map((i) => byId.get(i)).filter((w): w is Wallpaper => !!w).map(publicWallpaper);
}

// counted the way the gallery shows them: a phone/desktop pair of one artwork is one wallpaper
export const libraryCount = () => dedupeSeries(WALLPAPERS).length;
