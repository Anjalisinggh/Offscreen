// The 404 page: a phone whose lock screen reads 4:04, and ways back into the gallery.
import Link from 'next/link';
import { categories } from '@/lib/wallpapers';
import { moodPath } from '@/lib/client';
import { Arrow } from '@/components/icons';

export const metadata = { title: 'Page not found · Offscreen' };

export default function NotFound() {
  return (
    <div className="nf">
      <div className="nf-stage" aria-hidden="true">
        <div className="phone nf-phone">
          <div className="phone-screen">
            <div className="phone-island"></div>
            <div className="ls">
              <div className="ls-date">Nothing on this screen</div>
              <div className="ls-time">4:04</div>
            </div>
            <div className="phone-glare"></div>
          </div>
        </div>
      </div>
      <div className="nf-copy">
        <span className="eyebrow reveal">Error 404</span>
        <h1><span className="line-mask"><span>This page went</span></span><span className="line-mask" style={{ '--i': 1 } as React.CSSProperties}><span><em>offscreen.</em></span></span></h1>
        <p className="reveal">The link may be old, or the wallpaper may have been taken down. The rest of the gallery is still here.</p>
        <div className="actions reveal">
          <Link className="btn accent" href="/explore">Browse the gallery <Arrow /></Link>
          <Link className="btn" href="/">Back home</Link>
        </div>
        <div className="meta-block reveal">
          <h4>Or pick a mood</h4>
          <div className="tags">{categories.map((c) => <Link key={c.name} className="tag" href={moodPath(c.name)}>{c.name}</Link>)}</div>
        </div>
      </div>
    </div>
  );
}
