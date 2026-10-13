// A collection's own page, e.g. /dark-wallpapers: the address, title and description say what it
// is, so it can be found by a search for "dark wallpapers" and shared as a link.
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { categories, dedupeSeries, filterWallpapers, findWallpaper, loadWallpapers, publicWallpaper, sortWallpapers } from '@/lib/wallpapers';
import { moodPath } from '@/lib/client';
import { ogUrl } from '@/lib/media';
import Grid from '@/components/grid';

type Params = Promise<{ mood: string }>;

const BLURB: Record<string, string> = {
  Retro: 'Neon, film grain and faded colour: wallpapers that look like they were found on an old tape.',
  Dark: 'Deep blacks, moody reds and night skies. Easy on the eyes at night and striking on any screen.',
  Minimal: 'Quiet walls, soft light and plenty of empty space, so your icons and widgets can breathe.',
  Motivational: 'A line worth reading every time you pick up your phone: quotes and reminders to keep going.',
  Cute: 'Sleepy pups, bossy cats and other small soft things to make you smile at your lock screen.',
  Abstract: 'Colour, shape and texture with no subject at all, just a feeling.',
  Nature: 'Moonlit rivers, open skies and slow sunsets, for a screen that feels like a window.',
  Pink: 'Blush, rose and everything in between, from soft florals to bold statements.',
  Vintage: 'Old paintings, aged paper and classical scenes with a little dust left on them.',
  Psychedelic: 'Groovy shapes and loud colour straight out of a seventies poster.',
};

const categoryFor = (slug: string) => categories.find((c) => moodPath(c.name) === `/${slug}`);

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const c = categoryFor((await params).mood);
  if (!c) return { title: 'Page not found · Offscreen' };
  const items = dedupeSeries((await loadWallpapers()).filter((w) => w.category === c.name));
  const title = `${c.name} wallpapers for phone and desktop · Offscreen`;
  const description = `${items.length} hand-picked ${c.name.toLowerCase()} wallpapers for iPhone, Android and desktop. ${BLURB[c.name] ?? ''} Preview each one on a lock screen and download it.`.replace(/\s+/g, ' ');
  const cover = findWallpaper([...items].sort((a, b) => b.likes - a.likes)[0]?.id);
  const images = cover ? [{ url: ogUrl(cover), width: 1200, height: 630, alt: `${c.name} wallpapers on Offscreen` }] : undefined;
  return {
    title,
    description,
    alternates: { canonical: moodPath(c.name) },
    openGraph: { title, description, url: moodPath(c.name), siteName: 'Offscreen', type: 'website', images },
    twitter: { card: 'summary_large_image', title, description, images },
  };
}

export default async function MoodPage({ params }: { params: Params }) {
  const c = categoryFor((await params).mood);
  if (!c) notFound(); // only the collections have a page at this level; anything else is a 404
  const all = (await loadWallpapers()).map(publicWallpaper);
  const count = (device: string) => dedupeSeries(filterWallpapers(all, { category: c.name, device })).length;
  const items = sortWallpapers(dedupeSeries(filterWallpapers(all, { category: c.name })), 'trending');
  const filter = (device: string) => `/explore?category=${encodeURIComponent(c.name)}&device=${device}`;

  return (
    <>
      <div className="page-head">
        <span className="eyebrow reveal">Collection · {items.length} wallpapers</span>
        <h1><span className="line-mask"><span><em>{c.name}</em> wallpapers</span></span></h1>
        {BLURB[c.name] && <p className="reveal">{BLURB[c.name]}</p>}
      </div>
      <div className="filter-row reveal" style={{ paddingBottom: 14 }}>
        <span className="filter active">All devices</span>
        {count('phone') > 0 && <Link className="filter" href={filter('phone')}>Phone<sup>{count('phone')}</sup></Link>}
        {count('desktop') > 0 && <Link className="filter" href={filter('desktop')}>Desktop<sup>{count('desktop')}</sup></Link>}
      </div>
      <div className="filter-row reveal">
        <Link className="filter" href="/explore">All moods</Link>
        {categories.map((o) => (
          <Link key={o.name} className={`filter${o.name === c.name ? ' active' : ''}`} href={moodPath(o.name)}>{o.name}</Link>
        ))}
      </div>
      <Grid items={items} empty={<div className="empty-state"><h3>Nothing here <em>yet</em></h3>This collection is waiting for its first wallpaper.</div>} />
    </>
  );
}
