// Wallpaper images live on Cloudinary, uploaded as "authenticated" assets: nothing can be fetched
// from them without a URL signed with the API secret, so only the sizes the site signs here exist.
//   thumb   (520px)  grid/rail cards
//   display (1100px) the wallpaper page and collection tiles
//   download          the original file, signed only for a signed-in user's Download
// f_auto/q_auto let Cloudinary send AVIF or WebP, whichever the browser supports.
//
// Set CLOUDINARY_URL (cloudinary://API_KEY:API_SECRET@CLOUD_NAME, from the Cloudinary dashboard).
// Upload with `npm run upload-images` (scripts/upload-to-cloudinary.js).

const cloudinary = require('cloudinary').v2;

const FOLDER = 'offscreen';
const configured = () => !!process.env.CLOUDINARY_URL;

const publicIdFor = (filename) => `${FOLDER}/${filename.replace(/\.[^.]+$/, '')}`;

function signed(publicId, transformation, extra = {}) {
  return cloudinary.url(publicId, {
    type: 'authenticated', sign_url: true, secure: true, transformation, ...extra,
  });
}

const thumbUrl = (w) => signed(w.publicId, [{ width: 520, crop: 'limit' }, { fetch_format: 'auto', quality: 'auto' }]);
const displayUrl = (w) => signed(w.publicId, [{ width: 1100, crop: 'limit' }, { fetch_format: 'auto', quality: 'auto' }]);
const downloadUrl = (w) => signed(w.publicId, [{ flags: 'attachment' }], { format: w.filename.split('.').pop() });

module.exports = { cloudinary, configured, publicIdFor, thumbUrl, displayUrl, downloadUrl };
