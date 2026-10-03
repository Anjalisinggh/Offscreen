import Link from 'next/link';
import { findWallpaper, loadWallpapers, publicWallpaper, similarTo } from '@/lib/wallpapers';
import DetailView from '@/components/detail-view';

type Params = Promise<{ id: string }>;

export async function generateMetadata({ params }: { params: Params }) {
  const w = findWallpaper(Number((await params).id));
  return { title: w ? `${w.title} · Offscreen` : 'Wallpaper not found · Offscreen' };
}

export default async function WallpaperPage({ params }: { params: Params }) {
  const id = Number((await params).id);
  const items = await loadWallpapers();
  const w = items.find((x) => x.id === id);
  if (!w) {
    return <div className="empty-state"><h3>Wallpaper <em>not found</em></h3><Link className="btn" href="/explore">Back to gallery</Link></div>;
  }
  return <DetailView key={w.id} w={publicWallpaper(w)} similar={similarTo(w, items).map(publicWallpaper)} />;
}
