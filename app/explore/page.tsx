import Link from 'next/link';
import { categories, dedupeSeries, filterWallpapers, loadWallpapers, publicWallpaper, sortWallpapers } from '@/lib/wallpapers';
import { isDesktop } from '@/lib/client';
import Grid from '@/components/grid';

export const metadata = { title: 'Explore · Offscreen' };

type Params = Promise<{ category?: string; sort?: string; device?: string }>;
const SORT_LABEL: Record<string, string> = { trending: 'Trending', popular: 'Most loved', new: 'New arrivals', featured: 'Featured' };

export default async function Explore({ searchParams }: { searchParams: Params }) {
  const { category = 'All', sort = '', device = '' } = await searchParams;
  // chip counts use the full, undeduped set so they read as "how many wallpapers in total";
  // only the grid below hides paired phone/desktop duplicates
  const all = (await loadWallpapers()).map(publicWallpaper);
  const items = sortWallpapers(dedupeSeries(filterWallpapers(all, { category, device })), sort);
  const scope = device ? all.filter((w) => w.device === device) : all; // category counts follow the device

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
        <Link className={`filter${device === 'phone' ? ' active' : ''}`} href={href(category, 'phone')}>Phone<sup>{all.filter((w) => !isDesktop(w)).length}</sup></Link>
        <Link className={`filter${device === 'desktop' ? ' active' : ''}`} href={href(category, 'desktop')}>Desktop<sup>{all.filter(isDesktop).length}</sup></Link>
      </div>
      <div className="filter-row reveal">
        <Link className={`filter${category === 'All' ? ' active' : ''}`} href={href('All', device)}>All<sup>{scope.length}</sup></Link>
        {categories.map((c) => (
          <Link key={c.name} className={`filter${category === c.name ? ' active' : ''}`} href={href(c.name, device)}>
            {c.name}<sup>{scope.filter((w) => w.category === c.name).length}</sup>
          </Link>
        ))}
      </div>
      <Grid items={items} empty={<div className="empty-state"><h3>Nothing here <em>yet</em></h3>This collection is waiting for its first wallpaper.</div>} />
    </>
  );
}
