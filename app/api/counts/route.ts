// Live like/download totals per wallpaper, for the pages (lib/wallpapers.ts loads them from here
// when the pages run apart from the database). The same for everyone, so Cloudflare caches it.
import { NextResponse } from 'next/server';
import { store } from '@/lib/store';

export async function GET() {
  return NextResponse.json(await store.counts(), {
    headers: { 'Cache-Control': 'public, max-age=30, s-maxage=60' },
  });
}
