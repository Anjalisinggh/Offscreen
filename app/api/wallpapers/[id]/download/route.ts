// Records the download against the signed-in user, then hands over a signed Cloudinary URL for
// the original and what to name it; this is the only place a URL for the original is given out.
import path from 'path';
import { NextResponse } from 'next/server';
import { store } from '@/lib/store';
import { downloadUrl } from '@/lib/media';
import { fail, requireUser } from '@/lib/http';
import { findWallpaper, loadWallpapers } from '@/lib/wallpapers';
import type { Wallpaper } from '@/lib/types';

const downloadName = (w: Wallpaper) =>
  `${w.title.replace(/[^a-z0-9]+/gi, '-').replace(/(^-|-$)/g, '')}${path.extname(w.filename)}`;

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, denied } = await requireUser();
  if (denied) return denied;
  const id = Number((await params).id);
  const base = findWallpaper(id);
  if (!base) return fail(404, 'Not found');
  await store.recordDownload(user.id, id);
  const item = (await loadWallpapers()).find((w) => w.id === id)!;
  return NextResponse.json({ url: downloadUrl(base), name: downloadName(base), downloads: item.downloads });
}
