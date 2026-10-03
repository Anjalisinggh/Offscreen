// Uploads every wallpaper in data/wallpapers.json that isn't on Cloudinary yet, and records its
// publicId there. Safe to re-run: wallpapers that already have a publicId are skipped, and the
// JSON is saved after each upload, so an interrupted run picks up where it stopped.
//
// Each image is re-encoded without metadata first (no EXIF, no embedded "made with" credentials),
// losslessly for PNGs, so what people download is just the picture.
//
//   npm run upload-images   uploads whatever is in public/images (the one-time move to Cloudinary);
//                           new wallpapers are uploaded by generate-data.mts straight from their source file
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { v2 as cloudinary, type UploadApiResponse } from 'cloudinary';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
try { process.loadEnvFile(path.join(ROOT, '.env')); } catch { /* no .env */ }
// imports run before the line above, so the SDK never saw CLOUDINARY_URL; hand it over now
if (process.env.CLOUDINARY_URL) {
  const u = new URL(process.env.CLOUDINARY_URL);
  cloudinary.config({ cloud_name: u.hostname, api_key: decodeURIComponent(u.username), api_secret: decodeURIComponent(u.password), secure: true });
}

const WALLPAPERS_FILE = path.join(ROOT, 'data', 'wallpapers.json');
const IMAGES_DIR = path.join(ROOT, 'public', 'images');
const FOLDER = 'offscreen';

export interface Item { id: number; filename: string; publicId?: string; [k: string]: unknown }

export const configured = () => !!process.env.CLOUDINARY_URL;
export const publicIdFor = (filename: string) => `${FOLDER}/${filename.replace(/\.[^.]+$/, '')}`;

async function clean(file: string) {
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

function upload(buf: Buffer, publicId: string) {
  return new Promise<UploadApiResponse>((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      { public_id: publicId, type: 'authenticated', resource_type: 'image', overwrite: true },
      (err, res) => (err || !res ? reject(err) : resolve(res)),
    ).end(buf);
  });
}

export async function uploadWallpaper(w: Item, file: string) {
  const res = await upload(await clean(file), publicIdFor(w.filename));
  w.publicId = res.public_id;
  return res;
}

async function main() {
  if (!configured()) {
    console.error('Set CLOUDINARY_URL in .env first (Cloudinary dashboard → API Keys → "API environment variable").');
    process.exit(1);
  }
  const items: Item[] = JSON.parse(fs.readFileSync(WALLPAPERS_FILE, 'utf8'));
  const todo = items.filter((w) => !w.publicId);
  console.log(`${items.length - todo.length} already on Cloudinary, ${todo.length} to upload`);

  let done = 0, failed = 0;
  const queue = [...todo];
  const worker = async () => {
    for (let w; (w = queue.shift());) {
      try {
        const res = await uploadWallpaper(w, path.join(IMAGES_DIR, w.filename));
        fs.writeFileSync(WALLPAPERS_FILE, JSON.stringify(items, null, 2));
        console.log(`  ${++done}/${todo.length}  ${w.filename}  (${Math.round(res.bytes / 1024)} KB)`);
      } catch (e) {
        failed++;
        console.error(`  failed  ${w.filename}: ${(e as Error).message || e}`);
      }
    }
  };
  await Promise.all([worker(), worker(), worker(), worker()]);
  console.log(`Uploaded ${done}, failed ${failed}.`);
  if (failed) process.exit(1);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
