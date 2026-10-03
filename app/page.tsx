import Link from 'next/link';
import { categories, dedupeSeries, loadWallpapers, publicWallpaper, sortWallpapers } from '@/lib/wallpapers';
import { isDesktop } from '@/lib/client';
import type { PublicWallpaper } from '@/lib/types';
import CountUp from '@/components/count-up';
import Grid from '@/components/grid';
import HeroDeck from '@/components/hero-deck';
import SearchForm from '@/components/search-form';
import SectionHead, { ArrowLink } from '@/components/section-head';

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
  const desktops = shuffle(all.filter(isDesktop));
  const cols = [0, 1, 2].map((c) => pool.filter((_, i) => i % 3 === c).slice(0, 7));
  // phones/tablets get a fanned deck instead of the columns
  const deck = [...pool.filter((w) => w.featured), ...pool.filter((w) => !w.featured)].slice(0, 5);
  const moods = categories.map((c) => ({ ...c, n: all.filter((w) => w.category === c.name).length })).filter((c) => c.n);
  const downloads = all.reduce((s, w) => s + w.downloads, 0);

  const heroCol = (col: PublicWallpaper[], copy: number) => col.map((w) => (
    <Link key={`${copy}-${w.id}`} href={`/wallpaper/${w.id}`} tabIndex={-1}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={w.thumb} alt="" draggable={false} />
    </Link>
  ));
  const moodLinks = (copy: number) => moods.map((c) => (
    <Link key={`${copy}-${c.name}`} href={`/explore?category=${encodeURIComponent(c.name)}`}>{c.name}<small>{c.n}</small></Link>
  ));

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
          <HeroDeck items={deck} />
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

      <div className="marquee"><div className="marquee-track">{moodLinks(0)}{moodLinks(1)}</div></div>

      <section className="section">
        <SectionHead num="01" eyebrow="Trending" title={<>What everyone is <em>saving</em></>} link={<ArrowLink href="/explore?sort=trending">View all</ArrowLink>} />
        <Grid items={sortWallpapers(all, 'trending').slice(0, 12)} />
      </section>

      <section className="section">
        <SectionHead num="02" eyebrow="New arrivals" title={<>Just <em>added</em></>} link={<ArrowLink href="/explore?sort=new">View all</ArrowLink>} />
        <Grid items={sortWallpapers(all, 'new').slice(0, 12)} />
      </section>

      <section className="section">
        <SectionHead num="03" eyebrow="Popular" title={<>Most <em>loved</em></>} link={<ArrowLink href="/explore?sort=popular">View all</ArrowLink>} />
        <Grid items={sortWallpapers(all, 'popular').slice(0, 8)} />
      </section>

      {desktops.length > 0 && (
        <section className="section">
          <SectionHead num="04" eyebrow="Desktop" title={<>For your <em>desktop</em></>} link={<ArrowLink href="/explore?device=desktop">All desktop</ArrowLink>} />
          <Grid items={desktops.slice(0, 10)} />
        </section>
      )}

      <section className="section">
        <SectionHead num={desktops.length ? '05' : '04'} eyebrow="The gallery" title={<>Keep <em>discovering</em></>} link={<ArrowLink href="/explore">Full gallery</ArrowLink>} />
        <Grid items={shuffle(all).slice(0, 12)} />
      </section>
    </>
  );
}
