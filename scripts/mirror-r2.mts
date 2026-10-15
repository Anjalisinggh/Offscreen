// Copies both R2 buckets (offscreen-images, offscreen-originals) into a local folder, keeping
// their keys, so they can be moved to the API server's disk:
//   node scripts/mirror-r2.mts <folder>      → <folder>/images/…, <folder>/originals/…
// Needs R2_ACCOUNT_ID, R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY in .env. Skips files already there.
import fs from 'fs';
import path from 'path';
import { AwsClient } from 'aws4fetch';

process.loadEnvFile?.('.env');
const out = process.argv[2];
if (!out) { console.error('usage: node scripts/mirror-r2.mts <folder>'); process.exit(1); }
const r2 = new AwsClient({ accessKeyId: process.env.R2_ACCESS_KEY_ID!, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!, service: 's3', region: 'auto' });
const endpoint = `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;

async function* keys(bucket: string) {
  let token = '';
  do {
    const q = new URLSearchParams({ 'list-type': '2', 'max-keys': '1000', ...(token && { 'continuation-token': token }) });
    const xml = await (await r2.fetch(`${endpoint}/${bucket}?${q}`)).text();
    for (const m of xml.matchAll(/<Key>([^<]+)<\/Key>/g)) yield m[1].replace(/&amp;/g, '&');
    token = xml.match(/<NextContinuationToken>([^<]+)</)?.[1] || '';
  } while (token);
}

for (const [bucket, dir] of [['offscreen-images', 'images'], ['offscreen-originals', 'originals']]) {
  let n = 0, skipped = 0;
  for await (const key of keys(bucket)) {
    const file = path.join(out, dir, key);
    if (fs.existsSync(file)) { skipped++; continue; }
    const res = await r2.fetch(`${endpoint}/${bucket}/${key.split('/').map(encodeURIComponent).join('/')}`);
    if (!res.ok) throw new Error(`${bucket}/${key}: ${res.status}`);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()));
    n++;
  }
  console.log(`${bucket}: ${n} copied, ${skipped} already there`);
}
