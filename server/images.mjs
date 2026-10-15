// The public wallpaper images (thumb, display, og…, the same keys as on R2: lib/image-keys.ts),
// served from the API server's disk at images.offscreen.wtf. Every file is named by its content's
// place and never changes, so Cloudflare and browsers keep them for a year.
//   IMAGES_DIR=~/data/images PORT=4103 node server/images.mjs
import fs from 'fs';
import http from 'http';
import path from 'path';

const ROOT = path.resolve(process.env.IMAGES_DIR || 'images');
const PORT = Number(process.env.PORT || 4103);
const TYPES = { '.webp': 'image/webp', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png' };

http.createServer(async (req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405).end(); return; }
  const rel = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const file = path.join(ROOT, rel);
  const type = TYPES[path.extname(file).toLowerCase()];
  const stat = type && file.startsWith(ROOT + path.sep) ? await fs.promises.stat(file).catch(() => null) : null;
  if (!stat?.isFile()) {
    res.writeHead(404, { 'Content-Type': 'text/plain', 'Cache-Control': 'public, max-age=60' }).end('Not found');
    return;
  }
  res.writeHead(200, {
    'Content-Type': type,
    'Content-Length': stat.size,
    'Cache-Control': 'public, max-age=31536000, immutable',
    // the site reads the pictures' pixels (share images, colours), so any page may fetch them
    'Access-Control-Allow-Origin': '*',
    'X-Content-Type-Options': 'nosniff',
  });
  if (req.method === 'HEAD') res.end();
  else fs.createReadStream(file).pipe(res);
}).listen(PORT, '127.0.0.1', () => console.log(`images from ${ROOT} on 127.0.0.1:${PORT}`));
