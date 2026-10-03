'use client';
// A wallpaper's own page: shown on an iPhone (lock/home screen) or a MacBook (desktop /
// wallpaper only), with a live clock, a cursor-following tilt and a glow in the image's colour.
import Link from 'next/link';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { clockTime, fmt, isDesktop, prefersReducedMotion, timeAgo } from '@/lib/client';
import type { PublicWallpaper } from '@/lib/types';
import { useApp } from './app-context';
import CountUp from './count-up';
import Grid from './grid';
import SectionHead, { ArrowLink } from './section-head';
import { Camera, Desktop, Download, Heart, Phone, Share, Torch } from './icons';

export default function DetailView({ w, similar }: { w: PublicWallpaper; similar: PublicWallpaper[] }) {
  const { likedIds, likeCount, toggleLike, downloadWallpaper, toast } = useApp();
  const desktop = isDesktop(w);
  const liked = likedIds.has(w.id);
  const [alt, setAlt] = useState(false); // home screen (phone) / wallpaper only (laptop)
  const [now, setNow] = useState<Date | null>(null);
  const [pill, setPill] = useState({ width: 0, x: 0 });
  const [likePop, setLikePop] = useState(0);
  const [likes, setLikes] = useState<number | null>(null); // shown as a plain number once changed
  const seg = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const device = useRef<HTMLDivElement>(null);

  // live clock on the lock screen / menu bar (set after mount so server and browser agree)
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 10000);
    return () => clearInterval(t);
  }, []);

  // sliding pill under the active lock/home (or desktop/wallpaper-only) button
  useLayoutEffect(() => {
    const active = seg.current?.querySelector<HTMLButtonElement>('button.active');
    if (active) setPill({ width: active.offsetWidth, x: active.offsetLeft - 4 });
  }, [alt]);

  // gentle 3D tilt that follows the cursor, once the device has finished animating in
  useEffect(() => {
    const st = stage.current, dev = device.current;
    if (!st || !dev || prefersReducedMotion() || !window.matchMedia('(hover: hover)').matches) return;
    const k = desktop ? 0.5 : 1;
    const move = (e: MouseEvent) => {
      const r = st.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      dev.style.transform = `rotateY(${x * 14 * k}deg) rotateX(${-y * 10 * k}deg)`;
    };
    const leave = () => { dev.style.transform = ''; };
    const start = () => { st.addEventListener('mousemove', move); st.addEventListener('mouseleave', leave); };
    dev.addEventListener('animationend', start, { once: true });
    return () => {
      dev.removeEventListener('animationend', start);
      st.removeEventListener('mousemove', move);
      st.removeEventListener('mouseleave', leave);
    };
  }, [desktop]);

  // ambient glow tinted by the wallpaper's own colour
  useEffect(() => {
    const probe = new Image();
    probe.crossOrigin = 'anonymous'; // the image is on Cloudinary; needed to read its pixels
    probe.onload = () => {
      try {
        const c = document.createElement('canvas');
        c.width = c.height = 8;
        const ctx = c.getContext('2d')!;
        ctx.drawImage(probe, 0, 0, 8, 8);
        const d = ctx.getImageData(0, 0, 8, 8).data;
        let r = 0, g = 0, b = 0;
        for (let i = 0; i < d.length; i += 4) { r += d[i]; g += d[i + 1]; b += d[i + 2]; }
        const n = d.length / 4;
        stage.current?.style.setProperty('--glow', `rgba(${Math.round(r / n)}, ${Math.round(g / n)}, ${Math.round(b / n)}, .9)`);
      } catch { /* keep the default glow */ }
    };
    probe.src = w.thumb;
  }, [w.thumb]);

  const onLike = async () => {
    const res = await toggleLike(w.id);
    if (!res) return;
    setLikes(res.likes);
    setLikePop((p) => p + 1);
  };
  const onShare = async () => {
    const url = location.href;
    if (navigator.share) {
      navigator.share({ title: `${w.title} on Offscreen`, url }).catch(() => {});
    } else {
      try { await navigator.clipboard.writeText(url); toast('Link copied'); } catch { toast(url); }
    }
  };

  const time = now ? clockTime(now) : '';
  const image = <>{/* eslint-disable-next-line @next/next/no-img-element */}<img src={w.display} alt={w.title} draggable={false} /></>;
  const segButtons = (main: string, other: string) => (
    <div className="seg" ref={seg}>
      <span className="seg-pill" style={{ width: pill.width, transform: `translateX(${pill.x}px)` }}></span>
      <button className={!alt ? 'active' : ''} onClick={() => setAlt(false)}>{main}</button>
      <button className={alt ? 'active' : ''} onClick={() => setAlt(true)}>{other}</button>
    </div>
  );

  return (
    <>
      <nav className="crumbs reveal">
        <Link href="/explore">Gallery</Link><span>/</span>
        <Link href={`/explore?category=${encodeURIComponent(w.category)}`}>{w.category}</Link>
      </nav>
      <div className={`detail${desktop ? ' is-desktop' : ''}`}>
        <div className="detail-stage" ref={stage}>
          {desktop ? (
            <>
              <div className={`laptop${alt ? ' clean' : ''}`} ref={device}>
                <div className="laptop-lid">
                  <div className="laptop-screen">
                    <div className="laptop-notch"></div>
                    {image}
                    <div className="mac-bar">
                      <span><b>Finder</b><span>File</span><span>Edit</span><span>View</span></span>
                      <span>{now ? `${now.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}  ${time}` : ''}</span>
                    </div>
                    <div className="mac-win"></div>
                    <div className="mac-dock">{Array.from({ length: 8 }, (_, i) => <i key={i}></i>)}</div>
                    <div className="phone-glare"></div>
                  </div>
                </div>
                <div className="laptop-base"></div>
              </div>
              {segButtons('Desktop', 'Wallpaper only')}
            </>
          ) : (
            <>
              <div className={`phone${alt ? ' home' : ''}`} ref={device}>
                <div className="phone-screen">
                  <div className="phone-island"></div>
                  {image}
                  <div className="ls">
                    <div className="ls-date">{now ? now.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' }) : ''}</div>
                    <div className="ls-time">{time}</div>
                    <div className="ls-bottom"><span><Torch /></span><span><Camera /></span></div>
                  </div>
                  <div className="hs">{Array.from({ length: 16 }, (_, i) => <i key={i}></i>)}<div className="hs-dock"><i></i><i></i><i></i><i></i></div></div>
                  <div className="phone-glare"></div>
                </div>
              </div>
              {segButtons('Lock screen', 'Home screen')}
            </>
          )}
        </div>

        <div className="detail-info">
          <span className="eyebrow reveal">{w.category} collection<span className="device-tag">{desktop ? <><Desktop />Desktop</> : <><Phone />Phone</>}</span></span>
          <h1><span className="line-mask"><span>{w.title}</span></span></h1>
          <div className="stats reveal">
            <div><strong>{likes === null ? <CountUp value={likeCount(w)} /> : fmt(likes)}</strong><small>Likes</small></div>
            <div><strong><CountUp value={w.downloads} /></strong><small>Downloads</small></div>
            <div><strong>{timeAgo(w.createdAt)}</strong><small>Added</small></div>
          </div>
          <div className="actions reveal">
            <button className="btn accent" onClick={() => downloadWallpaper(w.id)}><Download /> Download</button>
            <button className={`btn${liked ? ' liked' : ''}`} onClick={onLike}>
              <Heart key={likePop} className={likePop ? 'pop' : undefined} /> <span>{liked ? 'Liked' : 'Like'}</span>
            </button>
            <button className="btn" onClick={onShare}><Share /> Share</button>
          </div>
          <div className="meta-block reveal">
            <h4>Tags</h4>
            <div className="tags">{w.tags.map((t) => <Link key={t} className="tag" href={`/search?q=${encodeURIComponent(t)}`}>{t}</Link>)}</div>
          </div>
        </div>
      </div>

      <section className="section">
        <SectionHead eyebrow="Similar style" title={<>You might also <em>like</em></>}
          link={<ArrowLink href={`/explore?category=${encodeURIComponent(w.category)}`}>{`More ${w.category}`}</ArrowLink>} />
        <Grid items={similar} empty={<div className="empty-state">No similar wallpapers yet.</div>} />
      </section>
    </>
  );
}

