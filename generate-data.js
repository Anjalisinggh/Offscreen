// Imports new images from the parent folder: uploads each to Cloudinary (without its metadata)
// and adds it to data/wallpapers.json. Needs CLOUDINARY_URL in .env.
// Safe to re-run: wallpapers that were already imported (matched by source filename) are left untouched,
// so titles, categories and tags edited by hand are kept.
try { process.loadEnvFile(require('path').join(__dirname, '.env')); } catch {}
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { configured } = require('./media');
const { uploadWallpaper } = require('./scripts/upload-to-cloudinary');

const SRC_DIR = path.join(__dirname, '..');
const DATA_DIR = path.join(__dirname, 'data');
const WALLPAPERS_FILE = path.join(DATA_DIR, 'wallpapers.json');

if (!configured()) {
  console.error('Set CLOUDINARY_URL in .env first.');
  process.exit(1);
}
fs.mkdirSync(DATA_DIR, { recursive: true });

const DEFAULT_CATEGORIES = ['Retro', 'Dark', 'Minimal', 'Motivational', 'Cute', 'Abstract', 'Nature', 'Pink', 'Vintage', 'Psychedelic'];
const KEYWORDS = {
  Pink: ['pink', 'blush', 'rose'], Dark: ['dark', 'night', 'black', 'navy'], Minimal: ['silver', 'champagne', 'minimal', 'ice'],
  Nature: ['sage', 'nature', 'forest'], Retro: ['amber', 'retro'], Psychedelic: ['purple', 'groovy'],
};

function slugify(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}
function titleFromFile(f) {
  const glass = f.match(/^\d+_(.+)_(darkmode|lightmode)_iphone16/);
  if (glass) {
    const color = glass[1].split('_').map(s => s[0].toUpperCase() + s.slice(1)).join(' ');
    return `${color} Glass ${glass[2] === 'darkmode' ? 'Dark' : 'Light'}`;
  }
  return 'Untitled Wallpaper';
}
function guessCategory(f) {
  const lower = f.toLowerCase();
  if (lower.includes('darkmode')) return 'Dark';
  for (const [cat, words] of Object.entries(KEYWORDS)) if (words.some(w => lower.includes(w))) return cat;
  return 'Abstract';
}

(async () => {
  const items = fs.existsSync(WALLPAPERS_FILE) ? JSON.parse(fs.readFileSync(WALLPAPERS_FILE, 'utf8')) : [];
  const known = new Set(items.map(w => w.source));
  // images deliberately taken off the site stay off, even though the originals are still in the folder
  const removedFile = path.join(DATA_DIR, 'removed.json');
  if (fs.existsSync(removedFile)) for (const f of JSON.parse(fs.readFileSync(removedFile, 'utf8'))) known.add(f);
  let nextId = items.length ? Math.max(...items.map(w => w.id)) + 1 : 1;
  const files = fs.readdirSync(SRC_DIR).filter(f => /\.(png|jpe?g|webp)$/i.test(f) && !known.has(f));

  for (let f of files) {
    const id = nextId++;
    const title = titleFromFile(f);
    const ext = path.extname(f).toLowerCase();
    const filename = `${slugify(title)}-${id}${ext}`;
    // the source file takes the wallpaper's own name, so no tool- or camera-given name is kept
    if (f !== filename && !fs.existsSync(path.join(SRC_DIR, filename))) {
      fs.renameSync(path.join(SRC_DIR, f), path.join(SRC_DIR, filename));
      f = filename;
    }
    const file = path.join(SRC_DIR, f);
    const { width, height } = await sharp(file).metadata();
    const device = width > height ? 'desktop' : 'phone';
    const w = {
      id, title, filename, source: f,
      category: guessCategory(f),
      tags: [device],
      likes: 0, downloads: 0, featured: false,
      createdAt: new Date().toISOString(),
      width, height, device,
    };
    await uploadWallpaper(w, file);
    items.push(w);
    fs.writeFileSync(WALLPAPERS_FILE, JSON.stringify(items, null, 2));
    console.log(`  ${f} → ${w.publicId}`);
  }

  fs.writeFileSync(WALLPAPERS_FILE, JSON.stringify(items, null, 2));
  for (const [name, init] of [['categories.json', DEFAULT_CATEGORIES.map(name => ({ name }))], ['likes.json', {}], ['users.json', {}]]) {
    const p = path.join(DATA_DIR, name);
    if (!fs.existsSync(p)) fs.writeFileSync(p, JSON.stringify(init, null, 2));
  }
  console.log(`Imported ${files.length} new wallpaper(s); library now has ${items.length}. Edit titles, categories and tags in data/wallpapers.json.`);
})();
