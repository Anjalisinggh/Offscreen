import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { store } from '@/lib/store';
import { currentUser, publicUser } from '@/lib/session';
import { libraryCount } from '@/lib/wallpapers';
import { AppProvider } from '@/components/app-context';
import Topbar from '@/components/topbar';
import Footer from '@/components/footer';
import Main from '@/components/main';
import Motion from '@/components/motion';
import './globals.css';

export const metadata: Metadata = {
  title: 'Offscreen · A collection for your screen',
  description: 'A collection for your screen. Wallpapers for phone and desktop, picked by mood.',
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' rx='18' fill='%23f4c7d4'/><text x='50' y='70' font-family='Georgia,serif' font-size='62' fill='%238e3456' text-anchor='middle' font-style='italic'>O</text></svg>",
  },
};
export const viewport: Viewport = { themeColor: '#faf3f1' };

// the saved theme is applied before the page paints, so dark mode never flashes light first
const THEME_SCRIPT = "try{if(localStorage.getItem('offscreen_theme')==='dark')document.documentElement.dataset.theme='dark'}catch(e){}";

export default async function RootLayout({ children }: { children: ReactNode }) {
  const user = await currentUser();
  const likedIds = user ? await store.likedIds(user.id) : [];

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&family=Manrope:wght@300;400;500;600;700;800&family=DM+Mono:wght@400;500&family=Anton&display=swap" rel="stylesheet" />
      </head>
      <body>
        <div className="preloader" aria-hidden="true">
          <div className="preloader-mark"><span>Off</span>screen</div>
          <div className="preloader-line"></div>
        </div>
        <div className="grain" aria-hidden="true"></div>

        <AppProvider initialUser={publicUser(user)} initialLikedIds={likedIds}>
          <Topbar />
          <Main>{children}</Main>
          <Footer count={libraryCount()} />
        </AppProvider>
        <Motion />
      </body>
    </html>
  );
}
