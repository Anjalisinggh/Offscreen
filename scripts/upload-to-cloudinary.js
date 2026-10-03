// Uploads every wallpaper in data/wallpapers.json that isn't on Cloudinary yet, and records its
// publicId there. Safe to re-run: wallpapers that already have a publicId are skipped, and the
// JSON is saved after each upload, so an interrupted run picks up where it stopped.
//
// Each image is re-encoded without metadata first (no EXIF, no embedded "made with" credentials),
// losslessly for PNGs, so what people download is just the picture.
//
//   npm run upload-images   uploads whatever is in public/images (the one-time move to Cloudinary);
//                           new wallpapers are uploaded by generate-data.js straight from their source file
try { process.loadEnvFile(require('path').join(__dirname, '..', '.env')); } catch {}

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { cloudinary, configured, publicIdFor } = require('../media');

const WALLPAPERS_FILE = path.join(__dirname, '..', 'data', 'wallpapers.json');
const IMAGES_DIR = path.join(__dirname, '..', 'public', 'images');

async function clean(file) {
  const img = sharp(file);
  const ext = path.extname(file).toLowerCase();
  const out = ext === '.png' ? img.png({ compressionLevel: 9 })
    : ext === '.webp' ? img.webp({ lossless: true })
    : img.jpeg({ quality: 95, mozjpeg: true });
  const buf = await out.toBuffer();
  const meta = await sharp(buf).metadata();
  if (meta.exif || meta.xmp || meta.iptc) throw new Error('metadata still present after re-encode');
  return buf;
}

function upload(buf, publicId) {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      { public_id: publicId, type: 'authenticated', resource_type: 'image', overwrite: true },
      (err, res) => (err ? reject(err) : resolve(res)),
    ).end(buf);
  });
}

async function uploadWallpaper(w, file) {
  const publicId = publicIdFor(w.filename);
  const res = await upload(await clean(file), publicId);
  w.publicId = res.public_id;
  return res;
}

async function main() {
  if (!configured()) {
    console.error('Set CLOUDINARY_URL in .env first (Cloudinary dashboard → API Keys → "API environment variable").');
    process.exit(1);
  }
  const items = JSON.parse(fs.readFileSync(WALLPAPERS_FILE, 'utf8'));
  const todo = items.filter((w) => !w.publicId);
  console.log(`${items.length - todo.length} already on Cloudinary, ${todo.length} to upload`);

  let done = 0, failed = 0;
  const queue = [...todo];
  const worker = async () => {
    for (let w; (w = queue.shift());) {
      const file = path.join(IMAGES_DIR, w.filename);
      try {
        const res = await uploadWallpaper(w, file);
        fs.writeFileSync(WALLPAPERS_FILE, JSON.stringify(items, null, 2));
        console.log(`  ${++done}/${todo.length}  ${w.filename}  (${Math.round(res.bytes / 1024)} KB)`);
      } catch (e) {
        failed++;
        console.error(`  failed  ${w.filename}: ${e.message || e.error?.message || e}`);
      }
    }
  };
  await Promise.all([worker(), worker(), worker(), worker()]);
  console.log(`Uploaded ${done}, failed ${failed}.`);
  if (failed) process.exit(1);
}

if (require.main === module) main();
module.exports = { uploadWallpaper };
