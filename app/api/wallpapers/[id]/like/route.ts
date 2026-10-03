import { NextResponse } from 'next/server';
import { store } from '@/lib/store';
import { fail, requireUser } from '@/lib/http';
import { findWallpaper, loadWallpapers } from '@/lib/wallpapers';

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, denied } = await requireUser();
  if (denied) return denied;
  const id = Number((await params).id);
  if (!findWallpaper(id)) return fail(404, 'Not found');
  const { liked } = await store.toggleLike(user.id, id);
  const item = (await loadWallpapers()).find((w) => w.id === id)!;
  return NextResponse.json({ liked, likes: item.likes });
}
