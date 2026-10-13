'use client';
// The saved theme is applied before the page paints, so dark mode never flashes light first.
// Normally the script runs straight from the server's HTML. The 404 page is built in the browser
// instead, where React never runs script tags: there the tag gets a type browsers ignore (which
// also keeps React from warning about it) and the same check runs as the page mounts.
import { useLayoutEffect } from 'react';

const THEME_SCRIPT = "try{if(localStorage.getItem('offscreen_theme')==='dark')document.documentElement.dataset.theme='dark'}catch(e){}";

export default function ThemeScript() {
  useLayoutEffect(() => {
    try { if (localStorage.getItem('offscreen_theme') === 'dark') document.documentElement.dataset.theme = 'dark'; } catch { /* storage unavailable */ }
  }, []);
  return (
    <script
      type={typeof window === 'undefined' ? 'text/javascript' : 'text/plain'}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }}
    />
  );
}
