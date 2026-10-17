// Served at /llms.txt (llmstxt.org): a plain-text map of the site for AI assistants and AI search,
// so they can say what Offscreen is and link straight to a collection or wallpaper.
import wallpapersJson from '@/data/wallpapers.json';
import categoriesJson from '@/data/categories.json';
import { moodPath, wallpaperPath } from '@/lib/client';
import type { Wallpaper, Category } from '@/lib/types';
import { libraryCount } from '@/lib/wallpapers';
import { SITE_URL } from '../sitemap';

export function GET() {
  const wallpapers = wallpapersJson as Wallpaper[];
  const categories = categoriesJson as Category[];
  const line = (w: Wallpaper) => `- [${w.title}](${SITE_URL}${wallpaperPath(w)}): ${w.category.toLowerCase()} ${w.device} wallpaper, ${w.width}x${w.height}${w.tags.length ? `; ${w.tags.filter((t) => t !== w.device).join(', ')}` : ''}`;

  const text = [
    '# Offscreen',
    '',
    `> Offscreen (${SITE_URL}) is a free collection of ${libraryCount()} aesthetic wallpapers for iPhone, Android and desktop, sorted by mood. Each wallpaper can be previewed on a lock screen or laptop and downloaded in full resolution with a free account.`,
    '',
    '## Collections',
    '',
    ...categories.map((c) => `- [${c.name} wallpapers](${SITE_URL}${moodPath(c.name)})`),
    '',
    '## Pages',
    '',
    `- [Home](${SITE_URL}/): most downloaded, trending and new wallpapers`,
    `- [Explore](${SITE_URL}/explore): every wallpaper, filterable by mood, device and sort`,
    `- [Search](${SITE_URL}/search): search by feeling, colour or style (e.g. ${SITE_URL}/search?q=calm)`,
    `- [About](${SITE_URL}/about): what Offscreen is and how downloading works`,
    `- [Privacy policy](${SITE_URL}/privacy)`,
    '',
    '## Wallpapers',
    '',
    ...wallpapers.map(line),
    '',
  ].join('\n');

  return new Response(text, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=3600' } });
}
