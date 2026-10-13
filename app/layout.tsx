import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { Analytics } from '@vercel/analytics/next';
import { store } from '@/lib/store';
import { currentUser, publicUser } from '@/lib/session';
import { libraryCount } from '@/lib/wallpapers';
import { googleEnabled } from '@/lib/google';
import { AppProvider } from '@/components/app-context';
import Topbar from '@/components/topbar';
import Footer from '@/components/footer';
import Main from '@/components/main';
import Motion from '@/components/motion';
import { SITE_URL } from './sitemap';
import './globals.css';

const TITLE = 'Offscreen · A collection for your screen';
const DESCRIPTION = 'A collection for your screen. Wallpapers for phone and desktop, picked by mood.';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: TITLE,
  description: DESCRIPTION,
  // what a shared link looks like in chats and on social sites; the picture is
  // app/opengraph-image.tsx, and each wallpaper page swaps in its own (app/wallpaper/[id])
  openGraph: { title: TITLE, description: DESCRIPTION, siteName: 'Offscreen', type: 'website' },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION },
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

        <AppProvider initialUser={publicUser(user)} initialLikedIds={likedIds} googleEnabled={googleEnabled()}>
          <Topbar />
          <Main>{children}</Main>
          <Footer count={libraryCount()} />
        </AppProvider>
        <Motion />
        {/* visitor counts, top pages, countries and referrers, shown under Analytics on Vercel */}
        <Analytics />
      </body>
    </html>
  );
}
