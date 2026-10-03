// Wallpaper images live on Cloudinary, uploaded as "authenticated" assets: nothing can be fetched
// from them without a URL signed with the API secret, so only the sizes the site signs here exist.
//   thumb   (520px)  grid/rail cards
//   display (1100px) the wallpaper page and collection tiles
//   download          the original file, signed only for a signed-in user's Download
// f_auto/q_auto let Cloudinary send AVIF or WebP, whichever the browser supports.
//
// Set CLOUDINARY_URL (cloudinary://API_KEY:API_SECRET@CLOUD_NAME, from the Cloudinary dashboard).
// Upload with `npm run upload-images` (scripts/upload-to-cloudinary.mts).
import 'server-only';
import { v2 as cloudinary } from 'cloudinary';
import type { Wallpaper } from './types';

export const configured = () => !!process.env.CLOUDINARY_URL;
if (!configured()) console.warn('CLOUDINARY_URL is not set: wallpaper images will not load.');

type Step = Record<string, string | number>;
function signed(publicId: string, transformation: Step[], extra: Step = {}) {
  return cloudinary.url(publicId, {
    type: 'authenticated', sign_url: true, secure: true, transformation, ...extra,
  });
}

export const thumbUrl = (w: Wallpaper) => signed(w.publicId!, [{ width: 520, crop: 'limit' }, { fetch_format: 'auto', quality: 'auto' }]);
export const displayUrl = (w: Wallpaper) => signed(w.publicId!, [{ width: 1100, crop: 'limit' }, { fetch_format: 'auto', quality: 'auto' }]);
export const downloadUrl = (w: Wallpaper) => signed(w.publicId!, [{ flags: 'attachment' }], { format: w.filename.split('.').pop()! });
