'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, type MouseEvent } from 'react';
import { useApp } from './app-context';
import Avatar from './avatar';
import { Moon, Search, Sun } from './icons';
import { prefersReducedMotion } from '@/lib/client';

const NAV = [
  ['/explore', 'Explore'],
  ['/categories', 'Collections'],
  ['/search', 'Search'],
  ['/likes', 'Liked'],
] as const;

// light (blush) is the default; the choice is remembered per browser. Switching plays a circular
// reveal that grows from the toggle button (View Transitions API); elsewhere it swaps instantly.
function toggleTheme(e: MouseEvent<HTMLButtonElement>) {
  const dark = document.documentElement.dataset.theme !== 'dark';
  const apply = () => {
    if (dark) document.documentElement.dataset.theme = 'dark';
    else delete document.documentElement.dataset.theme;
    document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')!.content = dark ? '#160e12' : '#faf3f1';
    try { localStorage.setItem('offscreen_theme', dark ? 'dark' : 'light'); } catch { /* storage unavailable */ }
  };
  if (prefersReducedMotion() || !document.startViewTransition) { apply(); return; }

  const btn = e.currentTarget.getBoundingClientRect();
  const x = btn.left + btn.width / 2;
  const y = btn.top + btn.height / 2;
  const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y)) + 12;
  const root = document.documentElement.style;
  root.setProperty('--reveal-x', `${x}px`);
  root.setProperty('--reveal-y', `${y}px`);
  root.setProperty('--reveal-r', `${radius}px`);
  // .ready/.finished reject if the transition is interrupted (a fast double-click); that's fine
  const t = document.startViewTransition(apply);
  t.ready.catch(() => {});
  t.finished.catch(() => {});
}

export default function Topbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, openAuth } = useApp();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [pathname]);

  return (
    <header className={`topbar${scrolled ? ' scrolled' : ''}`}>
      <div className="topbar-inner">
        <Link href="/" className="logo" aria-label="Offscreen home"><em>Off</em>screen</Link>
        <nav className="main-nav">
          {NAV.map(([href, label]) => (
            <Link key={href} href={href} className={pathname === href ? 'active' : ''}>{label}</Link>
          ))}
        </nav>
        <div className="topbar-actions">
          <button className="icon-btn theme-btn" aria-label="Switch light or dark theme" onClick={toggleTheme}>
            <Moon /><Sun />
          </button>
          <button className="icon-btn" aria-label="Search" onClick={() => router.push('/search')}><Search /></button>
          <div>
            {user
              ? <Link href="/profile" className="profile-chip"><Avatar user={user} className="profile-avatar" /><span>{user.name.split(' ')[0]}</span></Link>
              : <button className="btn-login" onClick={() => openAuth()}>Sign in</button>}
          </div>
        </div>
      </div>
    </header>
  );
}
