import Link from 'next/link';
import { categories, dedupeSeries, loadWallpapers, publicWallpaper } from '@/lib/wallpapers';
import { moodPath, pad } from '@/lib/client';
import { Arrow } from '@/components/icons';

export const metadata = {
  title: 'Wallpaper collections by mood · Offscreen',
  description: 'Browse wallpapers by feeling: dark, minimal, motivational, cute, retro, nature, pink, vintage, abstract and psychedelic, for phone and desktop.',
  alternates: { canonical: '/categories' },
};

export default async function Categories() {
  const all = dedupeSeries((await loadWallpapers()).map(publicWallpaper));
  return (
    <>
      <div className="page-head">
        <span className="eyebrow reveal">{categories.length} collections</span>
        <h1><span className="line-mask"><span>The <em>collections</em></span></span></h1>
        <p className="reveal">Every wallpaper, sorted by feeling. Choose a mood and start browsing.</p>
      </div>
      <div className="coll-grid">
        {categories.map((c, i) => {
          const items = all.filter((w) => w.category === c.name);
          const cover = [...items].sort((a, b) => b.likes - a.likes)[0];
          return (
            <Link key={c.name} className="coll reveal" style={{ '--i': i } as React.CSSProperties} href={moodPath(c.name)}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {cover && <img src={cover.display} alt="" draggable={false} loading="lazy" />}
              <span className="coll-num">{pad(i + 1)}</span>
              <h3>{c.name}</h3>
              <p>{items.length} wallpaper{items.length === 1 ? '' : 's'} <Arrow /></p>
            </Link>
          );
        })}
      </div>
    </>
  );
}
