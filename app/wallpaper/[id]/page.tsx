import { notFound, permanentRedirect } from 'next/navigation';
import { findWallpaper, loadWallpapers, publicWallpaper, similarTo } from '@/lib/wallpapers';
import { displayUrl, ogUrl, shareUrl, thumbUrl } from '@/lib/media';
import { moodPath, wallpaperPath } from '@/lib/client';
import { SITE_URL } from '@/app/sitemap';
import JsonLd, { breadcrumbs } from '@/components/json-ld';
import type { Wallpaper } from '@/lib/types';
import DetailView from '@/components/detail-view';
import type { Metadata } from 'next';

// the address is /wallpaper/115-pink-sunset; only the leading number is read, so /wallpaper/115
// and links made before a title changed still find it (and are sent on to the current address)
type Params = Promise<{ id: string }>;
const idOf = async (params: Params) => {
  const m = /^(\d+)(?:-|$)/.exec((await params).id);
  return m ? Number(m[1]) : NaN;
};

const describe = (w: Wallpaper) => {
  const desktop = w.device === 'desktop';
  const tags = w.tags.filter((t) => t !== w.device).slice(0, 4).join(', ');
  return `${w.title}, a ${w.category.toLowerCase()} ${desktop ? 'desktop' : 'phone'} wallpaper${tags ? ` (${tags})` : ''} on Offscreen. Preview it on ${desktop ? 'a laptop' : 'a lock screen'} and download it in full resolution.`;
};

// what the page is, for search engines and AI search: the wallpaper as an image, and where it sits
const structuredData = (w: Wallpaper) => {
  const url = `${SITE_URL}${wallpaperPath(w)}`;
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'ImageObject', '@id': `${url}#image`, name: w.title, description: describe(w), url,
        contentUrl: displayUrl(w), thumbnailUrl: thumbUrl(w),
        encodingFormat: 'image/webp', datePublished: w.createdAt, keywords: [w.category, ...w.tags].join(', '),
        genre: `${w.category} wallpaper`, creditText: 'Offscreen', copyrightNotice: 'Offscreen',
        creator: { '@type': 'Organization', name: 'Offscreen', url: SITE_URL },
        isPartOf: { '@id': `${SITE_URL}/#website` },
      },
      breadcrumbs(SITE_URL, [
        { name: 'Home', path: '/' },
        { name: `${w.category} wallpapers`, path: moodPath(w.category) },
        { name: w.title, path: wallpaperPath(w) },
      ]),
    ],
  };
};

// a shared wallpaper link previews that wallpaper, with its own title and description
export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const w = findWallpaper(await idOf(params));
  if (!w) return { title: 'Wallpaper not found · Offscreen' };
  const title = `${w.title} · Offscreen`;
  const description = describe(w);
  const url = wallpaperPath(w);
  const image = { url: ogUrl(w), width: 1200, height: 630, alt: w.title };
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, siteName: 'Offscreen', type: 'article', images: [image] },
    twitter: { card: 'summary_large_image', title, description, images: [image] },
  };
}

export default async function WallpaperPage({ params }: { params: Params }) {
  const id = await idOf(params);
  const items = await loadWallpapers();
  const w = items.find((x) => x.id === id);
  if (!w) notFound();
  if ((await params).id !== wallpaperPath(w).slice('/wallpaper/'.length)) permanentRedirect(wallpaperPath(w));
  return (
    <>
      <JsonLd data={structuredData(w)} />
      <DetailView key={w.id} w={publicWallpaper(w)} shareImage={shareUrl(w)} similar={similarTo(w, items).map(publicWallpaper)} />
    </>
  );
}
