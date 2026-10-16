// Uploads every wallpaper in data/wallpapers.json to Cloudflare R2: the original (re-encoded
// without metadata) to the private bucket, and the smaller sizes the site shows to the public one
// (see lib/media.ts). Safe to re-run: a wallpaper whose original is already on R2 is skipped, so an
// interrupted run picks up where it stopped. `--force` uploads everything again.
//
// Each image is re-encoded without metadata first (no EXIF, no embedded "made with" credentials),
// losslessly for PNGs, so what people download is just the picture.
//
//   npm run upload-images   uploads the source files from the parent folder of this project;
//                           new wallpapers are uploaded by generate-data.mts as they're imported
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { AwsClient } from 'aws4fetch';
import { sizeKey, originalKey, SIZE_EXT, type Size } from '../lib/image-keys.ts';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
try { process.loadEnvFile(path.join(ROOT, '.env')); } catch { /* no .env */ }

const WALLPAPERS_FILE = path.join(ROOT, 'data', 'wallpapers.json');
const SRC_DIR = path.join(ROOT, '..');
const FOLDER = 'offscreen';
const IMAGES_BUCKET = process.env.R2_IMAGES_BUCKET || 'offscreen-images';
const ORIGINALS_BUCKET = process.env.R2_ORIGINALS_BUCKET || 'offscreen-originals';
const TYPES = { webp: 'image/webp', jpg: 'image/jpeg', png: 'image/png', jpeg: 'image/jpeg' } as Record<string, string>;

export interface Item { id: number; filename: string; source?: string; device?: string; publicId?: string; [k: string]: unknown }

export const configured = () => !!process.env.OUT_DIR || !!(process.env.R2_ACCOUNT_ID && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY);
export const publicIdFor = (filename: string) => `${FOLDER}/${filename.replace(/\.[^.]+$/, '')}`;

let client: AwsClient | undefined;
function r2(method: 'PUT' | 'HEAD', bucket: string, key: string, body?: Buffer, headers: Record<string, string> = {}) {
  client ??= new AwsClient({ accessKeyId: process.env.R2_ACCESS_KEY_ID!, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!, service: 's3', region: 'auto' });
  return client.fetch(`https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${bucket}/${key}`, { method, body: body && new Uint8Array(body), headers });
}
// With OUT_DIR set, the files are written to <OUT_DIR>/images/… and <OUT_DIR>/originals/… instead,
// the same layout as ~/data/images and ~/data/originals on the API server, ready to copy there.
const OUT_DIR = process.env.OUT_DIR;
async function put(bucket: string, key: string, body: Buffer, cache: string) {
  if (OUT_DIR) {
    const file = path.join(OUT_DIR, bucket === ORIGINALS_BUCKET ? 'originals' : 'images', key);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, body);
    return;
  }
  const res = await r2('PUT', bucket, key, body, { 'content-type': TYPES[key.split('.').pop()!], 'cache-control': cache });
  if (!res.ok) throw new Error(`${key}: R2 said ${res.status} ${await res.text()}`);
}

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

// a phone wallpaper in a landscape link preview: shown whole, on a diagonal gradient between the
// colours of its top-left and bottom-right corners
async function padded(src: Buffer) {
  const { data } = await sharp(src).resize(2, 2, { fit: 'fill' }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const hex = (i: number) => `#${[data[i], data[i + 1], data[i + 2]].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
  const bg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${hex(0)}"/><stop offset="1" stop-color="${hex(9)}"/></linearGradient></defs><rect width="1200" height="630" fill="url(#g)"/></svg>`);
  const fg = await sharp(src).resize(1200, 630, { fit: 'inside' }).toBuffer();
  return sharp(bg).composite([{ input: fg, gravity: 'center' }]);
}

async function sized(src: Buffer, size: Size, device?: string) {
  const limit = (width: number) => sharp(src).resize({ width, withoutEnlargement: true });
  const img =
    size === 'thumb' ? limit(520)
    : size === 'display' ? limit(1100)
    : size === 'share' ? limit(1000)
    : size === 'ogtile' ? limit(420)
    : size === 'tile' ? sharp(src).resize(120, 120, { fit: 'cover', position: 'attention' })
    : device === 'desktop' ? sharp(src).resize(1200, 630, { fit: 'cover', position: 'attention' })
    : await padded(src);
  return SIZE_EXT[size] === 'webp' ? img.webp({ quality: 82 }).toBuffer() : img.flatten({ background: '#ffffff' }).jpeg({ quality: 85, mozjpeg: true }).toBuffer();
}

export async function uploadWallpaper(w: Item, file: string) {
  const publicId = publicIdFor(w.filename);
  const original = await clean(file);
  // sizes first, original last: the original being there is what marks a wallpaper as done
  for (const size of Object.keys(SIZE_EXT) as Size[]) {
    await put(IMAGES_BUCKET, sizeKey(publicId, size), await sized(original, size, w.device), 'public, max-age=31536000, immutable');
  }
  await put(ORIGINALS_BUCKET, originalKey(publicId, w.filename), original, 'private, max-age=0');
  w.publicId = publicId;
  return original.length;
}

async function main() {
  if (!configured()) {
    console.error('Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY in .env first (see the README).');
    process.exit(1);
  }
  const force = process.argv.includes('--force');
  const items: Item[] = JSON.parse(fs.readFileSync(WALLPAPERS_FILE, 'utf8'));
  const queue = [...items];
  let done = 0, skipped = 0, failed = 0;
  const worker = async () => {
    for (let w; (w = queue.shift());) {
      try {
        if (!force && (await r2('HEAD', ORIGINALS_BUCKET, originalKey(publicIdFor(w.filename), w.filename))).ok) { skipped++; continue; }
        const file = [w.source, w.filename].map((f) => f && path.join(SRC_DIR, f)).find((f) => f && fs.existsSync(f));
        if (!file) throw new Error(`no source file in ${SRC_DIR}`);
        const bytes = await uploadWallpaper(w, file);
        console.log(`  ${++done}  ${w.filename}  (${Math.round(bytes / 1024)} KB)`);
      } catch (e) {
        failed++;
        console.error(`  failed  ${w.filename}: ${(e as Error).message || e}`);
      }
    }
  };
  await Promise.all([worker(), worker(), worker(), worker()]);
  fs.writeFileSync(WALLPAPERS_FILE, JSON.stringify(items, null, 2));
  console.log(`Uploaded ${done}, already there ${skipped}, failed ${failed}.`);
  if (failed) process.exit(1);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
