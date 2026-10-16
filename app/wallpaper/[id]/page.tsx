import { notFound, permanentRedirect } from 'next/navigation';
import { findWallpaper, loadWallpapers, publicWallpaper, similarTo } from '@/lib/wallpapers';
import { ogUrl, shareUrl } from '@/lib/media';
import { wallpaperPath } from '@/lib/client';
import DetailView from '@/components/detail-view';
import type { Metadata } from 'next';

// the address is /wallpaper/115-pink-sunset; only the leading number is read, so /wallpaper/115
// and links made before a title changed still find it (and are sent on to the current address)
type Params = Promise<{ id: string }>;
const idOf = async (params: Params) => {
  const m = /^(\d+)(?:-|$)/.exec((await params).id);
  return m ? Number(m[1]) : NaN;
};

// a shared wallpaper link previews that wallpaper, with its own title and description
export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const w = findWallpaper(await idOf(params));
  if (!w) return { title: 'Wallpaper not found · Offscreen' };
  const desktop = w.device === 'desktop';
  const title = `${w.title} · Offscreen`;
  const description = `${w.title}, a ${w.category.toLowerCase()} ${desktop ? 'desktop' : 'phone'} wallpaper on Offscreen. Preview it on ${desktop ? 'a laptop' : 'a lock screen'} and download it.`;
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
  return <DetailView key={w.id} w={publicWallpaper(w)} shareImage={shareUrl(w)} similar={similarTo(w, items).map(publicWallpaper)} />;
}
