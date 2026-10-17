import Link from 'next/link';
import { categories, dedupeSeries, filterWallpapers, loadWallpapers, publicWallpaper, sortWallpapers } from '@/lib/wallpapers';
import { moodPath } from '@/lib/client';
import Grid from '@/components/grid';
import { SponsorTile } from '@/components/sponsors';
import type { Metadata } from 'next';

type Params = Promise<{ category?: string; sort?: string; device?: string }>;

// a category on its own is the same list as that collection's page (/dark-wallpapers), so search
// engines are pointed there instead of at this filtered view
export async function generateMetadata({ searchParams }: { searchParams: Params }): Promise<Metadata> {
  const { category } = await searchParams;
  const c = categories.find((x) => x.name.toLowerCase() === category?.toLowerCase());
  return {
    title: 'Explore all wallpapers · Offscreen',
    description: 'Every wallpaper on Offscreen for iPhone, Android and desktop: trending, most loved, most downloaded and new arrivals.',
    alternates: { canonical: c ? moodPath(c.name) : '/explore' },
  };
}
const SORT_LABEL: Record<string, string> = { trending: 'Trending', popular: 'Most loved', downloads: 'Most downloaded', new: 'New arrivals', featured: 'Featured' };

export default async function Explore({ searchParams }: { searchParams: Params }) {
  const { category = 'All', sort = '', device = '' } = await searchParams;
  const all = (await loadWallpapers()).map(publicWallpaper);
  const items = sortWallpapers(dedupeSeries(filterWallpapers(all, { category, device })), sort);
  // every chip shows how many cards it leads to, so paired phone/desktop crops count once here
  // too, the same as in the grid below, the home page and the footer
  const count = (cat: string, dev: string) => dedupeSeries(filterWallpapers(all, { category: cat, device: dev })).length;

  const href = (cat: string, dev: string) => {
    const q = new URLSearchParams();
    if (cat !== 'All') q.set('category', cat);
    if (sort) q.set('sort', sort);
    if (dev) q.set('device', dev);
    return `/explore${q.size ? '?' + q : ''}`;
  };
  const heading = category !== 'All' ? <em>{category}</em>
    : SORT_LABEL[sort] ? <em>{SORT_LABEL[sort]}</em>
    : device === 'desktop' ? <>For your <em>desktop</em></>
    : device === 'phone' ? <>For your <em>phone</em></>
    : <>The <em>gallery</em></>;

  return (
    <>
      <div className="page-head">
        <span className="eyebrow reveal">Explore · {items.length} wallpapers</span>
        <h1><span className="line-mask"><span>{heading}</span></span></h1>
      </div>
      <div className="filter-row reveal" style={{ paddingBottom: 14 }}>
        <Link className={`filter${!device ? ' active' : ''}`} href={href(category, '')}>All devices</Link>
        <Link className={`filter${device === 'phone' ? ' active' : ''}`} href={href(category, 'phone')}>Phone<sup>{count(category, 'phone')}</sup></Link>
        <Link className={`filter${device === 'desktop' ? ' active' : ''}`} href={href(category, 'desktop')}>Desktop<sup>{count(category, 'desktop')}</sup></Link>
      </div>
      <div className="filter-row reveal">
        <Link className={`filter${category === 'All' ? ' active' : ''}`} href={href('All', device)}>All<sup>{count('All', device)}</sup></Link>
        {categories.map((c) => (
          <Link key={c.name} className={`filter${category === c.name ? ' active' : ''}`} href={href(c.name, device)}>
            {c.name}<sup>{count(c.name, device)}</sup>
          </Link>
        ))}
      </div>
      <Grid items={items} slot={{ at: 0, node: <SponsorTile />, est: 300 }} empty={<div className="empty-state"><h3>Nothing here <em>yet</em></h3>This collection is waiting for its first wallpaper.</div>} />
    </>
  );
}
