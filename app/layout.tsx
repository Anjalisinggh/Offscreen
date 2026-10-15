import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import Script from 'next/script';
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
import ThemeScript from '@/components/theme-script';
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
  // Google AdSense's ownership check (the same account as the script in <head> and public/ads.txt)
  other: { 'google-adsense-account': 'ca-pub-8700115074348091' },
};
export const viewport: Viewport = { themeColor: '#faf3f1' };

// Google Analytics measurement ID, from Admin › Data streams › Off Screen
const GA_ID = 'G-B6NCM0WLTH';
const GA_SCRIPT = `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA_ID}');`;

export default async function RootLayout({ children }: { children: ReactNode }) {
  const user = await currentUser();
  const likedIds = user ? await store.likedIds(user.id) : [];

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <ThemeScript />
        {/* Google AdSense: loads the ad script and lets AdSense confirm this site is ours */}
        <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-8700115074348091" crossOrigin="anonymous"></script>
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
        {process.env.VERCEL && <Analytics />}
        {/* the same visits, sent to Google Analytics (the "Off Screen" web stream) */}
        <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
        <Script id="ga-init" strategy="afterInteractive">{GA_SCRIPT}</Script>
      </body>
    </html>
  );
}
