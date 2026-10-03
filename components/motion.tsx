'use client';
// Page-wide behaviour that isn't tied to one component:
//  - .reveal / .line-mask / [data-reveal] elements get .in when they scroll into view (CSS
//    animates them in), including ones added later by client-side navigation
//  - images get .loaded once they've loaded, so they fade in
//  - no "Save image as…" or dragging wallpapers off the page: Download is the way to get one
//  - the preloader lifts shortly after the first render
import { useEffect } from 'react';
import { prefersReducedMotion } from '@/lib/client';

const REVEAL = '.reveal, .line-mask, [data-reveal]';

export default function Motion() {
  useEffect(() => {
    const io = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          io.unobserve(entry.target);
        }
      }
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    const scan = (root: Element) => {
      if (root.matches(REVEAL) && !root.classList.contains('in')) io.observe(root);
      root.querySelectorAll(REVEAL).forEach((n) => { if (!n.classList.contains('in')) io.observe(n); });
      const imgs = root.tagName === 'IMG' ? [root as HTMLImageElement] : root.querySelectorAll('img');
      imgs.forEach((img) => { if (img.complete && img.naturalWidth) img.classList.add('loaded'); });
    };
    scan(document.body);
    const mo = new MutationObserver((records) => {
      for (const r of records) r.addedNodes.forEach((n) => { if (n instanceof Element) scan(n); });
    });
    mo.observe(document.body, { childList: true, subtree: true });

    const onLoad = (e: Event) => { if ((e.target as Element).tagName === 'IMG') (e.target as Element).classList.add('loaded'); };
    const onContext = (e: MouseEvent) => {
      const t = e.target as Element;
      if (t.tagName === 'IMG' || t.closest('.card-media, .phone, .laptop')) e.preventDefault();
    };
    const onDrag = (e: DragEvent) => { if ((e.target as Element).tagName === 'IMG') e.preventDefault(); };
    document.addEventListener('load', onLoad, true);
    document.addEventListener('contextmenu', onContext);
    document.addEventListener('dragstart', onDrag);

    const lift = setTimeout(() => document.body.classList.add('loaded'), prefersReducedMotion() ? 0 : 700);

    return () => {
      io.disconnect(); mo.disconnect(); clearTimeout(lift);
      document.removeEventListener('load', onLoad, true);
      document.removeEventListener('contextmenu', onContext);
      document.removeEventListener('dragstart', onDrag);
    };
  }, []);
  return null;
}
