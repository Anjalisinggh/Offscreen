const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const cookieParser = require('cookie-parser');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_KEY = process.env.ADMIN_KEY || 'admin123';

// On Vercel the deployed files are read-only and every instance is short-lived. There the data is
// copied into /tmp on a cold start, so the site works but likes, sign-ups and admin edits are not
// permanent. Locally (npm start) everything is read from and saved to ./data as normal.
const IS_SERVERLESS = !!(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const DATA_DIR = IS_SERVERLESS ? path.join('/tmp', 'offscreen-data') : path.join(__dirname, 'data');
const WALLPAPERS_FILE = path.join(DATA_DIR, 'wallpapers.json');
const CATEGORIES_FILE = path.join(DATA_DIR, 'categories.json');
const LIKES_FILE = path.join(DATA_DIR, 'likes.json');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
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
  [LIKES_FILE]: () => ({}),
  [USERS_FILE]: () => ({}),
};
for (const [file, seed] of Object.entries(seeds)) {
  if (!fs.existsSync(file)) writeJSON(file, seed());
}

// ---------- images & thumbnails ----------
const PUBLIC_DIR = path.join(__dirname, 'public');
const IMAGES_DIR = path.join(PUBLIC_DIR, 'images');
const THUMBS_DIR = path.join(PUBLIC_DIR, 'thumbs');

// sharp is only needed to make thumbnails and read upload sizes, so load it lazily
let sharpLib;
function sharp(...args) {
  sharpLib = sharpLib || require('sharp');
  return sharpLib(...args);
}

async function ensureThumb(filename) {
  const out = path.join(THUMBS_DIR, filename + '.webp');
  if (fs.existsSync(out)) return;
  await sharp(path.join(IMAGES_DIR, filename)).resize({ width: 520, withoutEnlargement: true }).webp({ quality: 78 }).toFile(out);
}

// thumbnails are committed to the repo; locally any missing ones (e.g. new uploads) are generated
if (!IS_SERVERLESS) {
  (async () => {
    fs.mkdirSync(THUMBS_DIR, { recursive: true });
    for (const w of readJSON(WALLPAPERS_FILE)) {
      try { await ensureThumb(w.filename); } catch (e) { console.warn('thumb failed', w.filename, e.message); }
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
    const isImage = /[\\/](images|thumbs)[\\/]/.test(filePath);
    res.setHeader('Cache-Control', isImage ? 'public, max-age=86400' : 'no-cache');
  },
}));

// ---------- auth (lightweight, demo-only: username identifies a user, no password) ----------
function getUser(req) {
  return req.cookies.wp_user || null;
}

app.post('/api/auth/login', (req, res) => {
  const { username } = req.body;
  if (!username || !username.trim()) return res.status(400).json({ error: 'Username required' });
  const clean = username.trim().slice(0, 30);
  const users = readJSON(USERS_FILE);
  if (!users[clean]) {
    users[clean] = { username: clean, joined: new Date().toISOString(), avatarSeed: crypto.randomBytes(4).toString('hex') };
    writeJSON(USERS_FILE, users);
  }
  res.cookie('wp_user', clean, { httpOnly: false, maxAge: 1000 * 60 * 60 * 24 * 30 });
  res.json({ user: users[clean] });
});

app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('wp_user');
  res.json({ ok: true });
});

app.get('/api/auth/me', (req, res) => {
  const username = getUser(req);
  if (!username) return res.json({ user: null });
  const users = readJSON(USERS_FILE);
  res.json({ user: users[username] || { username } });
});

// ---------- wallpapers ----------
app.get('/api/wallpapers', (req, res) => {
  const { category, q, sort, device } = req.query;
  let items = readJSON(WALLPAPERS_FILE);

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

app.get('/api/wallpapers/:id', (req, res) => {
  const items = readJSON(WALLPAPERS_FILE);
  const item = items.find(w => w.id === Number(req.params.id));
  if (!item) return res.status(404).json({ error: 'Not found' });
  res.json(item);
});

app.get('/api/wallpapers/:id/similar', (req, res) => {
  const items = readJSON(WALLPAPERS_FILE);
  const item = items.find(w => w.id === Number(req.params.id));
  if (!item) return res.status(404).json({ error: 'Not found' });
  // rank by shared category/tags, and keep to the same device (phone vs desktop) where possible
  const score = w =>
    (w.category === item.category ? 3 : 0) +
    w.tags.filter(t => item.tags.includes(t) && t !== w.device).length +
    (w.device === item.device ? 4 : 0);
  const similar = items
    .filter(w => w.id !== item.id)
    .map(w => ({ w, s: score(w) }))
    .filter(x => x.s > 4)
    .sort((a, b) => b.s - a.s)
    .slice(0, 8)
    .map(x => x.w);
  res.json(similar);
});

app.get('/api/categories', (req, res) => {
  res.json(readJSON(CATEGORIES_FILE));
});

// ---------- likes (requires login) ----------
app.post('/api/wallpapers/:id/like', (req, res) => {
  const username = getUser(req);
  if (!username) return res.status(401).json({ error: 'Login required' });
  const id = Number(req.params.id);
  const items = readJSON(WALLPAPERS_FILE);
  const item = items.find(w => w.id === id);
  if (!item) return res.status(404).json({ error: 'Not found' });

  const likes = readJSON(LIKES_FILE);
  likes[username] = likes[username] || [];
  const idx = likes[username].indexOf(id);
  let liked;
  if (idx === -1) {
    likes[username].push(id);
    item.likes += 1;
    liked = true;
  } else {
    likes[username].splice(idx, 1);
    item.likes = Math.max(0, item.likes - 1);
    liked = false;
  }
  writeJSON(LIKES_FILE, likes);
  writeJSON(WALLPAPERS_FILE, items);
  res.json({ liked, likes: item.likes });
});

app.get('/api/me/likes', (req, res) => {
  const username = getUser(req);
  if (!username) return res.status(401).json({ error: 'Login required' });
  const likes = readJSON(LIKES_FILE);
  const ids = new Set(likes[username] || []);
  const items = readJSON(WALLPAPERS_FILE).filter(w => ids.has(w.id));
  res.json(items);
});

app.get('/api/wallpapers/:id/liked', (req, res) => {
  const username = getUser(req);
  if (!username) return res.json({ liked: false });
  const likes = readJSON(LIKES_FILE);
  const liked = (likes[username] || []).includes(Number(req.params.id));
  res.json({ liked });
});

// ---------- download ----------
// counts the download and tells the browser where the file is and what to name it; the browser then
// saves /images/<file> itself (that file comes from the CDN on Vercel, not from this function)
function downloadName(item) {
  return `${item.title.replace(/[^a-z0-9]+/gi, '-').replace(/(^-|-$)/g, '')}${path.extname(item.filename)}`;
}
app.post('/api/wallpapers/:id/download', (req, res) => {
  const items = readJSON(WALLPAPERS_FILE);
  const item = items.find(w => w.id === Number(req.params.id));
  if (!item) return res.status(404).json({ error: 'Not found' });
  item.downloads += 1;
  writeJSON(WALLPAPERS_FILE, items);
  res.json({ url: `/images/${item.filename}`, name: downloadName(item), downloads: item.downloads });
});

// ---------- admin ----------
function requireAdmin(req, res, next) {
  if (req.headers['x-admin-key'] !== ADMIN_KEY) return res.status(401).json({ error: 'Unauthorized' });
  next();
}

app.post('/api/admin/login', (req, res) => {
  if (req.body.key === ADMIN_KEY) return res.json({ ok: true });
  res.status(401).json({ ok: false });
});

app.get('/api/admin/stats', requireAdmin, (req, res) => {
  const items = readJSON(WALLPAPERS_FILE);
  const users = readJSON(USERS_FILE);
  res.json({
    totalWallpapers: items.length,
    totalLikes: items.reduce((s, w) => s + w.likes, 0),
    totalDownloads: items.reduce((s, w) => s + w.downloads, 0),
    totalUsers: Object.keys(users).length,
    totalCategories: readJSON(CATEGORIES_FILE).length,  });
});

app.put('/api/admin/wallpapers/:id', requireAdmin, (req, res) => {
  const items = readJSON(WALLPAPERS_FILE);
  const item = items.find(w => w.id === Number(req.params.id));
  if (!item) return res.status(404).json({ error: 'Not found' });
  const { title, category, tags, featured } = req.body;
  if (title !== undefined) item.title = title;
  if (category !== undefined) item.category = category;
  if (tags !== undefined) item.tags = Array.isArray(tags) ? tags : String(tags).split(',').map(t => t.trim()).filter(Boolean);
  if (featured !== undefined) item.featured = !!featured;
  writeJSON(WALLPAPERS_FILE, items);
  res.json(item);
});

app.delete('/api/admin/wallpapers/:id', requireAdmin, (req, res) => {
  const items = readJSON(WALLPAPERS_FILE);
  const idx = items.findIndex(w => w.id === Number(req.params.id));
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  const [removed] = items.splice(idx, 1);
  writeJSON(WALLPAPERS_FILE, items);
  // the image files can only be removed where the disk is writable (not on Vercel)
  if (!IS_SERVERLESS) {
    for (const file of [path.join(IMAGES_DIR, removed.filename), path.join(THUMBS_DIR, removed.filename + '.webp')]) {
      if (fs.existsSync(file)) fs.unlinkSync(file);
    }
  }
  res.json({ ok: true });
});

app.post('/api/admin/categories', requireAdmin, (req, res) => {
  const { name, icon } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });
  const categories = readJSON(CATEGORIES_FILE);
  if (categories.some(c => c.name.toLowerCase() === name.toLowerCase())) {
    return res.status(400).json({ error: 'Category already exists' });
  }
  categories.push({ name, icon: icon || '🏷️' });
  writeJSON(CATEGORIES_FILE, categories);
  res.json(categories);
});

// multer for admin uploads (writes to the OS temp dir, then the file is moved into public/images)
const os = require('os');
const multer = require('multer');
const upload = multer({ dest: os.tmpdir(), limits: { fileSize: 25 * 1024 * 1024 } });

function uploadsSupported(req, res, next) {
  if (!IS_SERVERLESS) return next();
  res.status(503).json({ error: 'Uploads need persistent storage, which this hosted version does not have yet. Upload locally, then push to GitHub.' });
}

app.post('/api/admin/wallpapers', requireAdmin, uploadsSupported, upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Image required' });
  const items = readJSON(WALLPAPERS_FILE);
  const nextId = items.length ? Math.max(...items.map(w => w.id)) + 1 : 1;
  const ext = path.extname(req.file.originalname).toLowerCase() || '.png';
  const newFilename = req.file.filename + ext;
  // copy + delete rather than rename: the temp dir can be on a different drive
  fs.copyFileSync(req.file.path, path.join(IMAGES_DIR, newFilename));
  fs.unlinkSync(req.file.path);

  const { title, category, tags } = req.body;
  let width = 0, height = 0;
  try {
    ({ width, height } = await sharp(path.join(IMAGES_DIR, newFilename)).metadata());
  } catch (e) {
    fs.unlinkSync(path.join(IMAGES_DIR, newFilename));
    return res.status(400).json({ error: 'That file is not a readable image' });
  }
  const device = width > height ? 'desktop' : 'phone';
  const item = {
    id: nextId,
    title: title || 'Untitled Wallpaper',
    filename: newFilename,
    category: category || 'Abstract',
    tags: tags ? String(tags).split(',').map(t => t.trim()).filter(Boolean) : [],
    likes: 0,
    downloads: 0,
    featured: false,
    createdAt: new Date().toISOString(),
    width, height, device,
  };
  items.push(item);
  writeJSON(WALLPAPERS_FILE, items);
  ensureThumb(newFilename).catch(() => {});
  res.json(item);
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
