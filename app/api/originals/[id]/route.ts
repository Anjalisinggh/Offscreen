// The original file of a wallpaper, from the API server's disk (ORIGINALS_DIR). Only reachable
// with the 5-minute link /api/wallpapers/[id]/download hands a signed-in user (lib/media.ts).
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { Readable } from 'stream';
import { findWallpaper } from '@/lib/wallpapers';
import { ORIGINALS_DIR, originalPath, signOriginal } from '@/lib/media';
import { fail } from '@/lib/http';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  const q = new URL(req.url).searchParams;
  const expires = Number(q.get('e')), given = Buffer.from(q.get('s') || '');
  const good = Buffer.from(signOriginal(id, expires));
  if (!ORIGINALS_DIR || !expires || expires < Date.now() / 1000
    || given.length !== good.length || !crypto.timingSafeEqual(given, good)) return fail(403, 'This download link has expired. Please try again.');
  const w = findWallpaper(id);
  if (!w?.publicId) return fail(404, 'Not found');
  const file = path.join(ORIGINALS_DIR, originalPath(w));
  const stat = await fs.promises.stat(file).catch(() => null);
  if (!stat) return fail(404, 'Not found');
  const ext = path.extname(file).slice(1).toLowerCase();
  return new Response(Readable.toWeb(fs.createReadStream(file)) as ReadableStream, {
    headers: {
      'Content-Type': ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg',
      'Content-Length': String(stat.size),
      'Cache-Control': 'private, no-store',
    },
  });
}
