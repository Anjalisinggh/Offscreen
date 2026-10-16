import Link from 'next/link';
import { categories, dedupeSeries, loadWallpapers, publicWallpaper, sortWallpapers } from '@/lib/wallpapers';
import { isDesktop, wallpaperPath } from '@/lib/client';
import type { PublicWallpaper } from '@/lib/types';
import Grid from '@/components/grid';
import CountUp from '@/components/count-up';
import SearchForm from '@/components/search-form';
import SectionHead, { ArrowLink } from '@/components/section-head';
import { Arrow } from '@/components/icons';

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default async function Home() {
  const all = dedupeSeries((await loadWallpapers()).map(publicWallpaper));

  // three drifting columns of wallpapers, each doubled so the loop is seamless. The plain
  // colour-glass renders are flat next to everything else, so the hero keeps to the more
  // visually rich wallpapers (they still show up everywhere else on the site)
  const pool = shuffle(all.filter((w) => !isDesktop(w) && !w.tags.includes('glass')));
  const cols = [0, 1, 2].map((c) => pool.filter((_, i) => i % 3 === c).slice(0, 7));
  const downloads = all.reduce((s, w) => s + w.downloads, 0);

  const heroCol = (col: PublicWallpaper[], copy: number) => col.map((w) => (
    <Link key={`${copy}-${w.id}`} href={wallpaperPath(w)} tabIndex={-1}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={w.thumb} alt="" draggable={false} />
    </Link>
  ));

  // four short sections, and a wallpaper shown in one never comes back in a later one
  const shown = new Set<number>();
  const take = (items: PublicWallpaper[], n: number) => {
    const out = items.filter((w) => !shown.has(w.id)).slice(0, n);
    out.forEach((w) => shown.add(w.id));
    return out;
  };
  const phones = all.filter((w) => !isDesktop(w));
  const mostDownloaded = take(sortWallpapers(phones, 'downloads'), 4);
  const trending = take(sortWallpapers(phones, 'trending'), 8);
  const fresh = take(sortWallpapers(phones, 'new'), 8);
  const desktops = take(sortWallpapers(all.filter(isDesktop), 'trending'), 6);

  return (
    <>
      <section className="hero" data-reveal>
        <div className="hero-copy">
          <span className="eyebrow">A curated wallpaper gallery</span>
          <h1>
            <span className="line-mask" style={{ '--i': 0 } as React.CSSProperties}><span>Wallpapers</span></span>
            <span className="line-mask" style={{ '--i': 1 } as React.CSSProperties}><span>for your</span></span>
            <span className="line-mask" style={{ '--i': 2 } as React.CSSProperties}><span><em>mood.</em></span></span>
          </h1>
          <p className="hero-sub">A collection for your screen. Hand-picked wallpapers, from quiet and minimal to bold and vintage. Find one you love, preview it, and keep it.</p>
          <SearchForm variant="hero" />
          <div className="hero-meta">
            <div><span><CountUp value={all.length} /></span><small>Wallpapers</small></div>
            <div><span><CountUp value={categories.length} /></span><small>Collections</small></div>
            <div><span><CountUp value={downloads} /></span><small>Downloads</small></div>
          </div>
        </div>
        <div className="hero-wall" aria-hidden="true">
          {cols.map((col, c) => <div className="hero-col" key={c}>{heroCol(col, 0)}{heroCol(col, 1)}</div>)}
        </div>
      </section>

      <section className="section">
        <SectionHead num="01" eyebrow="Most downloaded" title={<>The ones people <em>keep</em></>} link={<ArrowLink href="/explore?sort=downloads">View all</ArrowLink>} />
        <Grid items={mostDownloaded} />
      </section>

      <section className="section">
        <SectionHead num="02" eyebrow="Trending" title={<>What everyone is <em>saving</em></>} link={<ArrowLink href="/explore?sort=trending">View all</ArrowLink>} />
        <Grid items={trending} />
      </section>

      <section className="section">
        <SectionHead num="03" eyebrow="New arrivals" title={<>Just <em>added</em></>} link={<ArrowLink href="/explore?sort=new">View all</ArrowLink>} />
        <Grid items={fresh} />
      </section>

      {desktops.length > 0 && (
        <section className="section">
          <SectionHead num="04" eyebrow="Desktop" title={<>For your <em>desktop</em></>} link={<ArrowLink href="/explore?device=desktop">All desktop</ArrowLink>} />
          <Grid items={desktops} />
        </section>
      )}

      <section className="home-cta reveal">
        <h2>{all.length} wallpapers, sorted by <em>mood</em></h2>
        <div className="home-cta-actions">
          <Link className="btn accent" href="/explore">Browse the full gallery <Arrow /></Link>
          <Link className="btn" href="/categories">See the collections</Link>
        </div>
      </section>
    </>
  );
}
