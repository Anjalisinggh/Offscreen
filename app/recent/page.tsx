import Link from 'next/link';
import { dedupeSeries, filterWallpapers, loadWallpapers, publicWallpaper, sortWallpapers } from '@/lib/wallpapers';
import Grid from '@/components/grid';
import type { Metadata } from 'next';

type Params = Promise<{ device?: string }>;

export const metadata: Metadata = {
  title: 'Recently added wallpapers · Offscreen',
  description: 'The newest wallpapers on Offscreen for iPhone, Android and desktop, latest first.',
  alternates: { canonical: '/recent' },
};

// how many of the newest wallpapers the page lists
const LIMIT = 96;

export default async function Recent({ searchParams }: { searchParams: Params }) {
  const { device = '' } = await searchParams;
  const all = (await loadWallpapers()).map(publicWallpaper);
  const items = sortWallpapers(dedupeSeries(filterWallpapers(all, { category: 'All', device })), 'new').slice(0, LIMIT);
  const href = (dev: string) => `/recent${dev ? `?device=${dev}` : ''}`;

  return (
    <>
      <div className="page-head">
        <span className="eyebrow reveal">Recent · newest first</span>
        <h1><span className="line-mask"><span>Just <em>added</em></span></span></h1>
      </div>
      <div className="filter-row reveal">
        <Link className={`filter${!device ? ' active' : ''}`} href={href('')}>All devices</Link>
        <Link className={`filter${device === 'phone' ? ' active' : ''}`} href={href('phone')}>Phone</Link>
        <Link className={`filter${device === 'desktop' ? ' active' : ''}`} href={href('desktop')}>Desktop</Link>
      </div>
      <Grid items={items} empty={<div className="empty-state"><h3>Nothing here <em>yet</em></h3>New wallpapers will show up here.</div>} />
    </>
  );
}
