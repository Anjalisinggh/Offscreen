'use client';
import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { Globe, Instagram, XLogo } from './icons';

export default function Footer({ count }: { count: number }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const gradRef = useRef<SVGLinearGradientElement>(null);

  // size the wordmark's viewBox to the exact ink of "OFFSCREEN" in Anton, so the letters run
  // edge to edge at their true proportions (no stretching, no empty space above or below)
  useEffect(() => {
    const fit = () => {
      const svg = svgRef.current, grad = gradRef.current;
      const text = svg?.querySelector('text');
      if (!svg || !grad || !text) return;
      const ctx = document.createElement('canvas').getContext('2d')!;
      ctx.font = `200px ${getComputedStyle(text).fontFamily}`;
      const m = ctx.measureText(text.textContent || '');
      const left = m.actualBoundingBoxLeft, width = left + m.actualBoundingBoxRight;
      const top = m.actualBoundingBoxAscent, height = top + m.actualBoundingBoxDescent;
      if (!width || !height) return;
      // the letters' outline (the svg's stroke) sits half outside the ink, so leave room for it
      const pad = (parseFloat(getComputedStyle(text).strokeWidth) || 0) / 2 + 1;
      svg.setAttribute('viewBox', `${-left - pad} ${-top - pad} ${width + pad * 2} ${height + pad * 2}`);
      grad.setAttribute('y1', String(-top));
      grad.setAttribute('y2', String(m.actualBoundingBoxDescent));
    };
    fit();
    document.fonts.load('200px Anton').then(fit).catch(() => {});
  }, []);

  return (
    <footer className="site-footer">
      <div className="foot-inner">
        <div className="foot-grid">
          <div className="foot-brand">
            <Link href="/" className="foot-logo" aria-label="Offscreen home"><em>Off</em>screen</Link>
            <p className="foot-tagline">A collection for your screen. Wallpapers for phone and desktop, picked by mood.</p>
            <p className="foot-status"><span className="foot-dot"></span><span>{count} wallpapers</span> · New every Sunday</p>
            <div className="foot-icons">
              <a href="https://instagram.com/anjalisinggh.12" target="_blank" rel="noopener" aria-label="Instagram"><Instagram /></a>
              <a href="https://x.com/anjalisinggh12" target="_blank" rel="noopener" aria-label="X (Twitter)"><XLogo /></a>
              <a href="https://anjali.monster" target="_blank" rel="noopener" aria-label="Portfolio"><Globe /></a>
            </div>
          </div>

          <div className="foot-col">
            <h4>Browse</h4>
            <Link href="/explore">Explore</Link>
            <Link href="/categories">Collections</Link>
            <Link href="/explore?device=desktop">Desktop wallpapers</Link>
            <Link href="/search">Search</Link>
            <Link href="/about">About us</Link>
            <Link href="/sponsor">Sponsor us</Link>
          </div>
          <div className="foot-col">
            <h4>For you</h4>
            <Link href="/explore?sort=new">New arrivals</Link>
            <Link href="/explore?sort=popular">Most loved</Link>
            <Link href="/explore?sort=downloads">Most downloaded</Link>
            <Link href="/likes">Your likes</Link>
            <Link href="/profile">Profile</Link>
          </div>
        </div>

        <div className="foot-meta">
          <span>© 2026 Offscreen</span>
          <span className="foot-meta-links">
            <Link href="/contact">Contact</Link>
            <Link href="/privacy">Privacy policy</Link>
          </span>
        </div>
      </div>

      <div className="foot-mark" data-reveal aria-hidden="true">
        <svg ref={svgRef} viewBox="0 -148 852 148">
          <defs>
            <linearGradient ref={gradRef} id="markFill" gradientUnits="userSpaceOnUse" x1="0" y1="-148" x2="0" y2="0">
              <stop offset="0" className="mk-top" />
              <stop offset=".5" className="mk-mid" />
              <stop offset="1" className="mk-bottom" />
            </linearGradient>
          </defs>
          <text x="0" y="0" className="mark-text" fill="url(#markFill)">OFFSCREEN</text>
        </svg>
      </div>
    </footer>
  );
}
