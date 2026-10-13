import { notFound } from 'next/navigation';
import { findWallpaper, loadWallpapers, publicWallpaper, similarTo } from '@/lib/wallpapers';
import { ogUrl } from '@/lib/media';
import DetailView from '@/components/detail-view';
import type { Metadata } from 'next';

type Params = Promise<{ id: string }>;

// a shared wallpaper link previews that wallpaper, with its own title and description
export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const w = findWallpaper(Number((await params).id));
  if (!w) return { title: 'Wallpaper not found · Offscreen' };
  const desktop = w.device === 'desktop';
  const title = `${w.title} · Offscreen`;
  const description = `${w.title}, a ${w.category.toLowerCase()} ${desktop ? 'desktop' : 'phone'} wallpaper on Offscreen. Preview it on ${desktop ? 'a laptop' : 'a lock screen'} and download it.`;
  const url = `/wallpaper/${w.id}`;
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
  const id = Number((await params).id);
  const items = await loadWallpapers();
  const w = items.find((x) => x.id === id);
  if (!w) notFound();
  return <DetailView key={w.id} w={publicWallpaper(w)} similar={similarTo(w, items).map(publicWallpaper)} />;
}
