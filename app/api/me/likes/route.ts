import { NextResponse } from 'next/server';
import { store } from '@/lib/store';
import { requireUser } from '@/lib/http';
import { wallpapersByIds } from '@/lib/wallpapers';

export async function GET() {
  const { user, denied } = await requireUser();
  if (denied) return denied;
  return NextResponse.json(await wallpapersByIds(await store.likedIds(user.id)));
}
