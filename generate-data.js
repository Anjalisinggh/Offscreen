// Imports new images from the parent folder into public/images and data/wallpapers.json.
// Safe to re-run: wallpapers that were already imported (matched by source filename) are left untouched,
// so titles, categories and tags edited in the admin are kept.
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const SRC_DIR = path.join(__dirname, '..');
const IMG_DIR = path.join(__dirname, 'public', 'images');
const DATA_DIR = path.join(__dirname, 'data');
const WALLPAPERS_FILE = path.join(DATA_DIR, 'wallpapers.json');

fs.mkdirSync(IMG_DIR, { recursive: true });
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
  let nextId = items.length ? Math.max(...items.map(w => w.id)) + 1 : 1;
  const files = fs.readdirSync(SRC_DIR).filter(f => /\.(png|jpe?g|webp)$/i.test(f) && !known.has(f));

  for (const f of files) {
    const id = nextId++;
    const title = titleFromFile(f);
    const filename = `${slugify(title)}-${id}${path.extname(f).toLowerCase()}`;
    fs.copyFileSync(path.join(SRC_DIR, f), path.join(IMG_DIR, filename));
    const { width, height } = await sharp(path.join(IMG_DIR, filename)).metadata();
    const device = width > height ? 'desktop' : 'phone';
    items.push({
      id, title, filename, source: f,
      category: guessCategory(f),
      tags: [device],
      likes: 0, downloads: 0, featured: false,
      createdAt: new Date().toISOString(),
      width, height, device,
    });
  }

  fs.writeFileSync(WALLPAPERS_FILE, JSON.stringify(items, null, 2));
  for (const [name, init] of [['categories.json', DEFAULT_CATEGORIES.map(name => ({ name }))], ['likes.json', {}], ['users.json', {}]]) {
    const p = path.join(DATA_DIR, name);
    if (!fs.existsSync(p)) fs.writeFileSync(p, JSON.stringify(init, null, 2));
  }
  console.log(`Imported ${files.length} new wallpaper(s); library now has ${items.length}. Edit titles and tags in the admin.`);
})();
