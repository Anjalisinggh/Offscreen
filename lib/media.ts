// Wallpaper images live on Cloudinary, uploaded as "authenticated" assets: nothing can be fetched
// from them without a URL signed with the API secret, so only the sizes the site signs here exist.
//   thumb   (520px)  grid/rail cards
//   display (1100px) the wallpaper page and collection tiles
//   og      (1200x630) the picture shown when a link is shared (Open Graph / Twitter cards)
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
// link previews are landscape and want a plain JPEG: a desktop wallpaper fills the card, a tall
// phone one is shown whole on a gradient of its own main colours. ogTileUrl is the small phone-shaped
// version the site-wide card (app/opengraph-image.tsx) is built from.
export const ogUrl = (w: Wallpaper) => signed(w.publicId!, [
  w.device === 'desktop'
    ? { width: 1200, height: 630, crop: 'fill', gravity: 'auto' }
    : { width: 1200, height: 630, crop: 'pad', background: 'auto:predominant_gradient:2:diagonal_desc' },
  { fetch_format: 'jpg', quality: 'auto' },
]);
export const ogTileUrl = (w: Wallpaper) => signed(w.publicId!, [{ width: 420, crop: 'limit' }, { fetch_format: 'jpg', quality: 'auto' }]);
// the picture attached when someone shares a wallpaper from its page (a plain JPEG every app takes)
export const shareUrl = (w: Wallpaper) => signed(w.publicId!, [{ width: 1000, crop: 'limit' }, { fetch_format: 'jpg', quality: 'auto' }]);
export const downloadUrl = (w: Wallpaper) => signed(w.publicId!, [{ flags: 'attachment' }], { format: w.filename.split('.').pop()! });
