'use client';
// The two buttons on the 404 page that need the browser: a random wallpaper, and the theme switch.
import { useRouter } from 'next/navigation';
import { Moon, Sun } from './icons';
import { toggleTheme } from './topbar';

export function SurpriseButton({ ids }: { ids: number[] }) {
  const router = useRouter();
  return (
    <button type="button" className="nf404-btn" onClick={() => router.push(`/wallpaper/${ids[Math.floor(Math.random() * ids.length)]}`)}>
      Surprise me <span aria-hidden="true">❋</span>
    </button>
  );
}

export function ThemeButton() {
  return (
    <button type="button" className="icon-btn theme-btn nf404-theme" aria-label="Switch light or dark theme" onClick={toggleTheme}>
      <Moon /><Sun />
    </button>
  );
}
