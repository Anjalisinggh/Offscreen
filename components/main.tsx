'use client';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

// the home page's hero runs under the transparent top bar, so it drops the top padding
export default function Main({ children }: { children: ReactNode }) {
  const home = usePathname() === '/';
  return <main id="app" className={home ? 'is-home' : ''}>{children}</main>;
}
