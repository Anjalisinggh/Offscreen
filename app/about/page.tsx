// What Offscreen is, in plain words: what's here, who it's for and how downloading works. Written for
// visitors first; it's also the page search engines and AI assistants can quote when asked about the site.
// Every number is read from the library and the live counts (downloads, likes, members), never typed in.
import Link from 'next/link';
import type { CSSProperties } from 'react';
import { categories, dedupeSeries, loadWallpapers, memberCount, publicWallpaper } from '@/lib/wallpapers';
import { imageAlt, isDesktop, moodPath, wallpaperPath } from '@/lib/client';
import { SITE_URL } from '../sitemap';
import JsonLd, { breadcrumbs } from '@/components/json-ld';
import CountUp from '@/components/count-up';

const DESCRIPTION = 'Offscreen is a curated wallpaper site for phones and desktops, with collections sorted by mood and style. What you’ll find here and how downloading works.';

export const metadata = {
  title: 'About Offscreen · Wallpapers for your screen, picked by mood',
  description: DESCRIPTION,
  alternates: { canonical: '/about' },
};

// 4669 → "4.6k": rounded down, so a "+" after it is always true
const floorK = (n: number) => (n >= 1000 ? `${Math.floor(n / 100) / 10}k` : String(n));

// the faint contour lines behind the numbers (decoration only)
function Waves({ className }: { className: string }) {
  return (
    <svg className={className} viewBox="0 0 600 260" preserveAspectRatio="none" aria-hidden="true">
      {Array.from({ length: 14 }, (_, i) => (
        <path key={i} d={`M0 ${150 + i * 5} C 140 ${40 + i * 9}, 260 ${250 - i * 4}, 380 ${120 + i * 6} S 560 ${60 + i * 7}, 600 ${90 + i * 6}`} />
      ))}
    </svg>
  );
}

export default async function About() {
  const every = (await loadWallpapers()).map(publicWallpaper);
  // a wallpaper made for phone and desktop counts once, but both versions' downloads and likes count
  const all = dedupeSeries(every);
  const downloads = every.reduce((s, w) => s + w.downloads, 0);
  const likes = every.reduce((s, w) => s + w.likes, 0);
  const members = await memberCount();
  const desktop = all.filter(isDesktop).length;
  const cover = [...all].filter((w) => !isDesktop(w)).sort((a, b) => b.downloads - a.downloads)[0];
  const byMood = categories
    .map((c) => ({ name: c.name, n: every.filter((w) => w.category === c.name).reduce((s, w) => s + w.downloads, 0) }))
    .sort((a, b) => b.n - a.n)
    .slice(0, 5);

  const ld = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'AboutPage', name: 'About Offscreen', url: `${SITE_URL}/about`, description: DESCRIPTION, about: { '@id': `${SITE_URL}/#org` }, isPartOf: { '@id': `${SITE_URL}/#website` } },
      breadcrumbs(SITE_URL, [{ name: 'Home', path: '/' }, { name: 'About', path: '/about' }]),
    ],
  };

  return (
    <div className="about">
      <JsonLd data={ld} />

      {/* 1 · the big title, a few lines on what this is, and one wallpaper */}
      <section className="ab-hero">
        <h1 className="ab-title" aria-label="About us">
          <span className="line-mask"><span>ABO<b>U</b>T</span></span>
          <span className="line-mask ab-us" style={{ '--i': 2 } as CSSProperties}><span>US</span></span>
        </h1>
        <div className="ab-copy reveal">
          <p>Offscreen is a curated wallpaper site. Instead of an endless feed, every wallpaper sits in a collection by feeling, so you can look for something calm, dark, cute or motivating and find it quickly. New wallpapers arrive every Sunday.</p>
          <p>Most are tall, for iPhone and Android lock screens; some are wide, for laptops and monitors. Each one is shown on a phone or a laptop first, so you see how it looks before you download it.</p>
          <p>Browsing, previewing and searching are open to everyone. To download in full resolution, sign in with a free account (an emailed code or Google); your downloads and likes stay in your profile.</p>
          <Link href="/explore" className="ab-btn">Browse the collection</Link>
        </div>
        {cover && (
          <Link href={wallpaperPath(cover)} className="ab-photo reveal" style={{ '--i': 2 } as CSSProperties}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={cover.display} alt={imageAlt(cover)} draggable={false} />
            <span>Most downloaded · {cover.title}</span>
          </Link>
        )}
      </section>

      {/* 2 · what it brings together, and the numbers, in staggered boxes */}
      <section className="ab-stats">
        <Waves className="ab-waves" />
        <div className="ab-box ab-b1 reveal"><i>01</i><small>Wallpapers</small><strong><CountUp value={all.length} /></strong></div>
        <p className="ab-lede reveal">Offscreen brings together <em>hand-picked</em> wallpapers, a <em>lock-screen preview</em> and collections sorted by <em>feeling</em>.</p>
        <div className="ab-box ab-b2 ab-fill reveal" style={{ '--i': 1 } as CSSProperties}><i>02</i><small>Collections</small><strong>{categories.length}</strong></div>
        {members !== null
          ? <div className="ab-box ab-b3 reveal" style={{ '--i': 2 } as CSSProperties}><i>03</i><small>Members</small><strong><CountUp value={members} exact /></strong></div>
          : <div className="ab-box ab-b3 reveal" style={{ '--i': 2 } as CSSProperties}><i>03</i><small>Phone · Desktop</small><strong>{all.length - desktop}<span>/</span>{desktop}</strong></div>}
        <div className="ab-box ab-b4 reveal" style={{ '--i': 3 } as CSSProperties}><i>04</i><small>Likes</small><strong><CountUp value={likes} exact /></strong></div>
      </section>

      {/* 3 · the big number */}
      <section className="ab-big">
        <div className="ab-num reveal">{floorK(downloads)}<b>+</b></div>
        <div className="ab-list reveal" style={{ '--i': 1 } as CSSProperties}>
          <h2><em>Downloads</em> across<br />every screen</h2>
          <ol>{byMood.map((m) => <li key={m.name}><span>{m.n.toLocaleString('en')}</span><Link href={moodPath(m.name)}>{m.name} wallpapers</Link></li>)}</ol>
        </div>
      </section>
    </div>
  );
}
