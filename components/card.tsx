'use client';
import { useRouter } from 'next/navigation';
import { useState, type CSSProperties } from 'react';
import { fmt, isDesktop, ratio } from '@/lib/client';
import type { PublicWallpaper } from '@/lib/types';
import { useApp } from './app-context';
import { Download, Heart } from './icons';

export default function Card({ w, i }: { w: PublicWallpaper; i: number }) {
  const router = useRouter();
  const { likedIds, likeCount, toggleLike, downloadWallpaper } = useApp();
  const [pop, setPop] = useState(0);
  const liked = likedIds.has(w.id);

  return (
    <article className="card reveal" style={{ '--i': i % 8 } as CSSProperties}
      onClick={(e) => { if (!(e.target as Element).closest('button')) router.push(`/wallpaper/${w.id}`); }}>
      <div className="card-media" style={{ '--ar': ratio(w) } as CSSProperties}>
        {w.featured && <span className="badge">Featured</span>}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={w.thumb} alt={w.title} draggable={false} loading="lazy" decoding="async" />
        <div className="card-actions">
          <button key={pop} className={`like-btn${liked ? ' liked' : ''}${pop ? ' pop' : ''}`} aria-label="Like"
            onClick={async (e) => { e.stopPropagation(); if (await toggleLike(w.id)) setPop((p) => p + 1); }}>
            <Heart />
          </button>
          <button className="dl-btn" aria-label="Download"
            onClick={(e) => { e.stopPropagation(); downloadWallpaper(w.id); }}>
            <Download />
          </button>
        </div>
      </div>
      <div className="card-info">
        <div>
          <h3 className="card-title">{w.title}</h3>
          <div className="card-cat">{w.category}{isDesktop(w) && <span className="dev">· Desktop</span>}</div>
        </div>
        <span className={`card-likes${liked ? ' liked' : ''}`} title={liked ? 'You liked this' : undefined}><Heart /><b>{fmt(likeCount(w))}</b></span>
      </div>
    </article>
  );
}
