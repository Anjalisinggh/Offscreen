'use client';
// A glowing wave of fine lines drifting behind a hero, in the site's accent colour: many thin curves
// that move together like a ribbon of light, pinched in at the screen's edges. Drawn on a canvas, so it
// stays sharp at any size. It only animates while on screen, and holds still for people who prefer
// less motion. In light mode it is the accent colour; in dark mode the lines are a soft near-white over a
// faint accent glow, so the dark page doesn't turn pink.
import { useEffect, useRef } from 'react';

const LINES = 46;

export default function LightWave({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    let w = 0, h = 0, raf = 0, visible = true, rgb = '194, 90, 124', lines = rgb, dark = false;
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const readTheme = () => {
      const css = getComputedStyle(document.documentElement);
      rgb = css.getPropertyValue('--accent-rgb').trim() || rgb;
      dark = document.documentElement.dataset.theme === 'dark';
      lines = dark ? '255, 241, 246' : rgb;
    };
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth; h = canvas.clientHeight;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    // one curve across the screen: two slow waves on top of each other, squeezed towards the edges
    const curve = (u: number, t: number, spread: number) => {
      const cy = h * 0.5, amp = Math.min(h * 0.18, w * 0.11, 140);
      const step = Math.max(4, w / 160);
      ctx.beginPath();
      for (let x = -step; x <= w + step; x += step) {
        const nx = x / w;
        const env = 0.25 + 0.75 * Math.pow(Math.sin(Math.PI * Math.min(Math.max(nx, 0), 1)), 1.4);
        const y = cy + env * (
          amp * 0.55 * Math.sin(2 * Math.PI * nx * 1.1 + t * 0.55 + u * 2.4) +
          amp * 0.35 * Math.sin(2 * Math.PI * nx * 2.2 - t * 0.8 + u * 3.6) +
          (u - 0.5) * amp * spread
        );
        if (x <= -step) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
    };

    const draw = (time: number) => {
      const t = time / 1000;
      ctx.clearRect(0, 0, w, h);
      // a soft glow under the lines
      ctx.save();
      ctx.filter = `blur(${Math.round(Math.min(w, 1400) / 45)}px)`;
      for (let k = 0; k < 3; k++) {
        curve(0.3 + k * 0.2, t, 0.9);
        ctx.strokeStyle = `rgba(${rgb}, ${dark ? 0.05 : 0.09})`;
        ctx.lineWidth = Math.min(h * 0.14, 90);
        ctx.stroke();
      }
      ctx.restore();
      // the fine lines, brightest in the middle of the bundle
      ctx.lineWidth = 1;
      for (let i = 0; i < LINES; i++) {
        const u = i / (LINES - 1);
        const mid = 1 - Math.abs(u - 0.5) * 2;
        curve(u, t, 1.1);
        ctx.strokeStyle = `rgba(${lines}, ${(dark ? 0.03 : 0.05) + mid * (dark ? 0.13 : 0.17)})`;
        ctx.stroke();
      }
    };

    const loop = (time: number) => { draw(time); if (visible && !still) raf = requestAnimationFrame(loop); };
    const start = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(loop); };

    readTheme(); resize(); start();
    const ro = new ResizeObserver(() => { resize(); if (still || !visible) draw(performance.now()); });
    ro.observe(canvas);
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) start(); });
    io.observe(canvas);
    const mo = new MutationObserver(() => { readTheme(); if (still || !visible) draw(performance.now()); });
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => { cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); mo.disconnect(); };
  }, []);

  return <canvas ref={ref} className={className} aria-hidden="true" />;
}
