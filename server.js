const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const cookieParser = require('cookie-parser');
const { createStore } = require('./store');

const app = express();
const PORT = process.env.PORT || 3000;

// On Vercel the deployed files are read-only, so the committed wallpaper/category data is copied
// into /tmp on a cold start. Accounts, likes and downloads live in the database (store.js).
const IS_SERVERLESS = !!(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const DATA_DIR = IS_SERVERLESS ? path.join('/tmp', 'offscreen-data') : path.join(__dirname, 'data');
const WALLPAPERS_FILE = path.join(DATA_DIR, 'wallpapers.json');
const CATEGORIES_FILE = path.join(DATA_DIR, 'categories.json');
function readJSON(file) {
  return JSON.parse(fs.readFileSync(file, 'utf-8'));
}
function writeJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

fs.mkdirSync(DATA_DIR, { recursive: true });
// require() makes sure the bundler ships the committed data with the serverless function
const seeds = {
  [WALLPAPERS_FILE]: () => require('./data/wallpapers.json'),
  [CATEGORIES_FILE]: () => require('./data/categories.json'),
};
for (const [file, seed] of Object.entries(seeds)) {
  if (!fs.existsSync(file)) writeJSON(file, seed());
}

// ---------- accounts, likes, downloads ----------
// Postgres when DATABASE_URL is set (see store.js and the README), a local JSON file otherwise.
const store = createStore({ dataDir: DATA_DIR, databaseUrl: process.env.DATABASE_URL });
console.log(`Storing accounts, likes and downloads in: ${store.kind}`);
if (IS_SERVERLESS && store.kind === 'json') {
  console.warn('DATABASE_URL is not set: accounts, likes and downloads will not survive on Vercel.');
}

// ---------- images & thumbnails ----------
const PUBLIC_DIR = path.join(__dirname, 'public');
const IMAGES_DIR = path.join(PUBLIC_DIR, 'images');
const THUMBS_DIR = path.join(PUBLIC_DIR, 'thumbs');
const DISPLAY_DIR = path.join(PUBLIC_DIR, 'display');
const THUMBS_AVIF_DIR = path.join(PUBLIC_DIR, 'thumbs-avif');
const DISPLAY_AVIF_DIR = path.join(PUBLIC_DIR, 'display-avif');

// sharp is only needed to make thumbnails and read upload sizes, so load it lazily
let sharpLib;
function sharp(...args) {
  sharpLib = sharpLib || require('sharp');
  return sharpLib(...args);
}

// Two derived sizes per wallpaper, both much lighter than the original upload (often 1-3MB):
//  - thumbs (520px):   grid/rail cards, where dozens can be on screen at once
//  - display (1100px): the single large image on a wallpaper's own page and on collection
//                       tiles — sharp at those sizes, but nowhere near the full original
// Each also gets an AVIF twin (smaller again than WebP for photographic images); the page
// picks whichever the browser supports via a <picture> element, WebP if neither does.
// The original file is only ever sent back whole for the actual Download button.
async function ensureThumb(filename) {
  const out = path.join(THUMBS_DIR, filename + '.webp');
  if (!fs.existsSync(out)) {
    await sharp(path.join(IMAGES_DIR, filename)).resize({ width: 520, withoutEnlargement: true }).webp({ quality: 78 }).toFile(out);
  }
  const outAvif = path.join(THUMBS_AVIF_DIR, filename + '.avif');
  if (!fs.existsSync(outAvif)) {
    await sharp(path.join(IMAGES_DIR, filename)).resize({ width: 520, withoutEnlargement: true }).avif({ quality: 50, effort: 4 }).toFile(outAvif);
  }
}
async function ensureDisplay(filename) {
  const out = path.join(DISPLAY_DIR, filename + '.webp');
  if (!fs.existsSync(out)) {
    await sharp(path.join(IMAGES_DIR, filename)).resize({ width: 1100, withoutEnlargement: true }).webp({ quality: 82 }).toFile(out);
  }
  const outAvif = path.join(DISPLAY_AVIF_DIR, filename + '.avif');
  if (!fs.existsSync(outAvif)) {
    await sharp(path.join(IMAGES_DIR, filename)).resize({ width: 1100, withoutEnlargement: true }).avif({ quality: 50, effort: 4 }).toFile(outAvif);
  }
}

// all four are committed to the repo; locally any missing ones (e.g. new uploads) are generated
if (!IS_SERVERLESS) {
  (async () => {
    for (const dir of [THUMBS_DIR, DISPLAY_DIR, THUMBS_AVIF_DIR, DISPLAY_AVIF_DIR]) fs.mkdirSync(dir, { recursive: true });
    for (const w of readJSON(WALLPAPERS_FILE)) {
      try { await ensureThumb(w.filename); await ensureDisplay(w.filename); } catch (e) { console.warn('resize failed', w.filename, e.message); }
    }
    console.log('Thumbnails ready');
  })();
}

app.use(express.json());
app.use(cookieParser());
// images can be cached; html/css/js are revalidated so design changes show up immediately
// (on Vercel, files in public/ are served by the CDN before requests reach this app)
app.use(express.static(PUBLIC_DIR, {
  setHeaders(res, filePath) {
    const isImage = /[\\/](images|thumbs|thumbs-avif|display|display-avif)[\\/]/.test(filePath);
    res.setHeader('Cache-Control', isImage ? 'public, max-age=86400' : 'no-cache');
  },
}));

// ---------- auth: name + email to sign up, email alone to log in ----------
// The session cookie holds the user id plus an HMAC of it, so it can't be forged or edited.
// With a database the secret is derived from DATABASE_URL (itself secret), so nothing extra is
// needed on Vercel; set SESSION_SECRET to use your own.
const SESSION_SECRET = process.env.SESSION_SECRET
  || (process.env.DATABASE_URL ? crypto.createHash('sha256').update('offscreen-session:' + process.env.DATABASE_URL).digest('hex')
    : IS_SERVERLESS ? crypto.randomBytes(32).toString('hex') : 'offscreen-local-dev-secret');
const sign = (v) => crypto.createHmac('sha256', SESSION_SECRET).update(v).digest('base64url');

function startSession(res, user) {
  const id = String(user.id);
  res.cookie('sid', `${id}.${sign(id)}`, {
    httpOnly: true, sameSite: 'lax', secure: IS_SERVERLESS, maxAge: 1000 * 60 * 60 * 24 * 90,
  });
}
async function currentUser(req) {
  const [id, sig] = String(req.cookies.sid || '').split('.');
  if (!id || !sig) return null;
  const good = Buffer.from(sign(id)), given = Buffer.from(sig);
  if (good.length !== given.length || !crypto.timingSafeEqual(good, given)) return null;
  return store.findUserById(Number(id));
}
const requireUser = async (req, res, next) => {
  req.user = await currentUser(req);
  if (!req.user) return res.status(401).json({ error: 'Please sign in first' });
  next();
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const cleanEmail = (v) => String(v || '').trim().toLowerCase();

app.post('/api/auth/signup', async (req, res) => {
  const name = String(req.body.name || '').trim().slice(0, 60);
  const email = cleanEmail(req.body.email);
  if (!name) return res.status(400).json({ error: 'Please enter your name' });
  if (!EMAIL_RE.test(email) || email.length > 200) return res.status(400).json({ error: 'Please enter a valid email address' });
  const user = await store.createUser({ name, email });
  if (!user) return res.status(409).json({ error: 'That email already has an account. Log in instead.' });
  startSession(res, user);
  res.json({ user });
});

app.post('/api/auth/login', async (req, res) => {
  const email = cleanEmail(req.body.email);
  if (!EMAIL_RE.test(email)) return res.status(400).json({ error: 'Please enter a valid email address' });
  const user = await store.findUserByEmail(email);
  if (!user) return res.status(404).json({ error: 'No account with that email yet. Sign up first.' });
  startSession(res, user);
  res.json({ user });
});

app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('sid');
  res.json({ ok: true });
});

app.get('/api/auth/me', async (req, res) => {
  res.json({ user: await currentUser(req) });
});

// likes and downloads live in the database; the likes/downloads numbers in wallpapers.json are
// just the starting totals, and what people actually do is added on top of them
async function loadWallpapers() {
  const [items, c] = await Promise.all([Promise.resolve(readJSON(WALLPAPERS_FILE)), store.counts()]);
  return items.map((w) => ({ ...w, likes: (w.likes || 0) + (c.likes[w.id] || 0), downloads: (w.downloads || 0) + (c.downloads[w.id] || 0) }));
}

// ---------- wallpapers ----------
app.get('/api/wallpapers', async (req, res) => {
  const { category, q, sort, device, dedupe } = req.query;
  let items = await loadWallpapers();

  if (device === 'phone' || device === 'desktop') {
    items = items.filter(w => w.device === device);
  }
  if (category && category !== 'All') {
    items = items.filter(w => w.category.toLowerCase() === category.toLowerCase());
  }
  if (q) {
    const needle = q.toLowerCase();
    items = items.filter(w =>
      w.title.toLowerCase().includes(needle) ||
      w.category.toLowerCase().includes(needle) ||
      w.tags.some(t => t.toLowerCase().includes(needle))
    );
  }
  // dedupe=1 collapses phone/desktop crops of the same artwork to one result (run after the
  // filters above so a device filter still keeps its own member of the pair). Public browsing
  // views pass this; the plain list (used for counts) leaves it off.
  if (dedupe === '1') {
    const seenSeries = new Set();
    items = items.filter(w => {
      if (!w.series) return true;
      if (seenSeries.has(w.series)) return false;
      seenSeries.add(w.series);
      return true;
    });
  }
  if (sort === 'trending') {
    // activity weighted toward recently added wallpapers
    const score = w => (w.likes * 2 + w.downloads) / Math.pow((Date.now() - new Date(w.createdAt)) / 86400000 + 2, 0.8);
    items = [...items].sort((a, b) => score(b) - score(a));
  } else if (sort === 'popular') {
    items = [...items].sort((a, b) => b.likes - a.likes);
  } else if (sort === 'new') {
    items = [...items].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  } else if (sort === 'featured') {
    items = items.filter(w => w.featured);
  }
  res.json(items);
});

app.get('/api/wallpapers/:id', async (req, res) => {
  const items = await loadWallpapers();
  const item = items.find(w => w.id === Number(req.params.id));
  if (!item) return res.status(404).json({ error: 'Not found' });
  res.json(item);
});

app.get('/api/wallpapers/:id/similar', async (req, res) => {
  const items = await loadWallpapers();
  const item = items.find(w => w.id === Number(req.params.id));
  if (!item) return res.status(404).json({ error: 'Not found' });
  // rank by shared category/tags, and keep to the same device (phone vs desktop) where possible
  const score = w =>
    (w.category === item.category ? 3 : 0) +
    w.tags.filter(t => item.tags.includes(t) && t !== w.device).length +
    (w.device === item.device ? 4 : 0);
  const seenSeries = new Set();
  const similar = items
    // never recommend a phone/desktop crop of the wallpaper someone is already looking at,
    // and never recommend two crops of some other wallpaper alongside each other either
    .filter(w => w.id !== item.id && !(item.series && w.series === item.series))
    .map(w => ({ w, s: score(w) }))
    .filter(x => x.s > 4)
    .sort((a, b) => b.s - a.s)
    .filter(x => {
      if (!x.w.series) return true;
      if (seenSeries.has(x.w.series)) return false;
      seenSeries.add(x.w.series);
      return true;
    })
    .slice(0, 8)
    .map(x => x.w);
  res.json(similar);
});

app.get('/api/categories', (req, res) => {
  res.json(readJSON(CATEGORIES_FILE));
});

// ---------- likes and downloads (both need an account) ----------
app.post('/api/wallpapers/:id/like', requireUser, async (req, res) => {
  const id = Number(req.params.id);
  if (!readJSON(WALLPAPERS_FILE).some(w => w.id === id)) return res.status(404).json({ error: 'Not found' });
  const { liked } = await store.toggleLike(req.user.id, id);
  const item = (await loadWallpapers()).find(w => w.id === id);
  res.json({ liked, likes: item.likes });
});

async function wallpapersByIds(ids) {
  const byId = new Map((await loadWallpapers()).map(w => [w.id, w]));
  return ids.map(i => byId.get(i)).filter(Boolean); // keeps the order the ids came in (most recent first)
}
app.get('/api/me/likes', requireUser, async (req, res) => {
  res.json(await wallpapersByIds(await store.likedIds(req.user.id)));
});
app.get('/api/me/downloads', requireUser, async (req, res) => {
  res.json(await wallpapersByIds(await store.downloadedIds(req.user.id)));
});

// Records the download against the signed-in user, then tells the browser where the file is and
// what to name it; the browser saves /images/<file> itself (it comes from the CDN on Vercel).
function downloadName(item) {
  return `${item.title.replace(/[^a-z0-9]+/gi, '-').replace(/(^-|-$)/g, '')}${path.extname(item.filename)}`;
}
app.post('/api/wallpapers/:id/download', requireUser, async (req, res) => {
  const id = Number(req.params.id);
  const base = readJSON(WALLPAPERS_FILE).find(w => w.id === id);
  if (!base) return res.status(404).json({ error: 'Not found' });
  await store.recordDownload(req.user.id, id);
  const item = (await loadWallpapers()).find(w => w.id === id);
  res.json({ url: `/images/${base.filename}`, name: downloadName(base), downloads: item.downloads });
});

// a failed database call should look like an API error, not an HTML page
app.use('/api', (err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Something went wrong on our side. Please try again.' });
});

// the SPA shell for any non-API route that isn't a static file
app.get(/^\/(?!api\/).*/, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Vercel imports this module and uses the exported app; `npm start` runs it as a normal server
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Offscreen running at http://localhost:${PORT}`);
  });
}

module.exports = app;
