// Wallpaper images live on Cloudflare R2, in two buckets:
//   offscreen-images     public, served from IMAGES_URL (https://images.offscreen.wtf). Holds only
//                        the smaller sizes, made once at upload by scripts/upload-to-r2.mts:
//     thumb   (520px)  grid/rail cards
//     display (1100px) the wallpaper page and collection tiles
//     og      (1200x630) the picture shown when a link is shared (Open Graph / Twitter cards)
//     ogtile  (420px)  the phones in the site-wide card (app/opengraph-image.tsx)
//     share   (1000px) the picture attached when someone shares a wallpaper from its page
//     tile    (120x120) the squares that draw "404" on the not-found page
//   offscreen-originals  private. The original file is only reachable through a link signed here
//                        with the R2 API key, for a signed-in user's Download, valid for 5 minutes.
//
// Set IMAGES_URL, R2_ACCOUNT_ID, R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY (see the README).
import 'server-only';
import { AwsClient } from 'aws4fetch';
import { sizeKey, originalKey, type Size } from './image-keys';
import type { Wallpaper } from './types';

const IMAGES_URL = (process.env.IMAGES_URL || '').replace(/\/$/, '');
const ORIGINALS_BUCKET = process.env.R2_ORIGINALS_BUCKET || 'offscreen-originals';

export const configured = () => !!IMAGES_URL;
if (!configured()) console.warn('IMAGES_URL is not set: wallpaper images will not load.');

const url = (size: Size) => (w: Wallpaper) => `${IMAGES_URL}/${sizeKey(w.publicId!, size)}`;
export const thumbUrl = url('thumb');
export const displayUrl = url('display');
export const ogUrl = url('og');
export const ogTileUrl = url('ogtile');
export const shareUrl = url('share');
export const tileUrl = url('tile');

let r2: AwsClient | undefined;
export async function downloadUrl(w: Wallpaper) {
  r2 ??= new AwsClient({
    accessKeyId: process.env.R2_ACCESS_KEY_ID!, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    service: 's3', region: 'auto',
  });
  const u = new URL(`https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${ORIGINALS_BUCKET}/${originalKey(w.publicId!, w.filename)}`);
  u.searchParams.set('X-Amz-Expires', '300');
  return (await r2.sign(u.toString(), { aws: { signQuery: true } })).url;
}
