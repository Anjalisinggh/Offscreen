// Everything the site remembers about people: accounts, likes and downloads.
// (The wallpapers themselves are committed content in data/wallpapers.json.)
//
// Two backends with the same async interface:
//  - Postgres, when DATABASE_URL is set (Supabase, Neon, any Postgres). This is the one to use
//    in production: it survives restarts and is shared by every Vercel instance.
//  - A JSON file (data/db.json) otherwise, so `npm start` works with zero setup.

const fs = require('fs');
const path = require('path');

const norm = (email) => String(email).trim().toLowerCase();

// ---------------------------------------------------------------- Postgres
function postgresStore(url) {
  const { Pool } = require('pg');
  const local = /localhost|127\.0\.0\.1/.test(url);
  const pool = new Pool({
    connectionString: url,
    ssl: local ? false : { rejectUnauthorized: false },
    max: 3, // each serverless instance only needs a couple of connections
  });
  const q = (text, params) => pool.query(text, params);

  let ready;
  const init = () => (ready ||= q(`
    CREATE TABLE IF NOT EXISTS users (
      id         BIGSERIAL PRIMARY KEY,
      name       TEXT        NOT NULL,
      email      TEXT        NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE UNIQUE INDEX IF NOT EXISTS users_email_key ON users (lower(email));
    CREATE TABLE IF NOT EXISTS likes (
      user_id      BIGINT      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      wallpaper_id INTEGER     NOT NULL,
      created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
      PRIMARY KEY (user_id, wallpaper_id)
    );
    CREATE TABLE IF NOT EXISTS downloads (
      id           BIGSERIAL   PRIMARY KEY,
      user_id      BIGINT      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      wallpaper_id INTEGER     NOT NULL,
      created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS downloads_user_idx ON downloads (user_id, created_at DESC);
  `).catch((e) => { ready = null; throw e; }));

  const user = (r) => r && { id: Number(r.id), name: r.name, email: r.email, createdAt: r.created_at };

  return {
    kind: 'postgres',
    init,
    async createUser({ name, email }) {
      await init();
      const { rows } = await q(
        'INSERT INTO users (name, email) VALUES ($1, $2) ON CONFLICT DO NOTHING RETURNING *',
        [name, norm(email)]);
      return rows[0] ? user(rows[0]) : null; // null = that email already has an account
    },
    async findUserByEmail(email) {
      await init();
      const { rows } = await q('SELECT * FROM users WHERE lower(email) = $1', [norm(email)]);
      return user(rows[0]);
    },
    async findUserById(id) {
      await init();
      const { rows } = await q('SELECT * FROM users WHERE id = $1', [id]);
      return user(rows[0]);
    },
    async toggleLike(userId, wid) {
      await init();
      const del = await q('DELETE FROM likes WHERE user_id = $1 AND wallpaper_id = $2', [userId, wid]);
      if (del.rowCount) return { liked: false };
      await q('INSERT INTO likes (user_id, wallpaper_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [userId, wid]);
      return { liked: true };
    },
    async likedIds(userId) {
      await init();
      const { rows } = await q('SELECT wallpaper_id FROM likes WHERE user_id = $1 ORDER BY created_at DESC', [userId]);
      return rows.map((r) => r.wallpaper_id);
    },
    async recordDownload(userId, wid) {
      await init();
      await q('INSERT INTO downloads (user_id, wallpaper_id) VALUES ($1, $2)', [userId, wid]);
    },
    async downloadedIds(userId) {
      await init();
      const { rows } = await q(
        'SELECT wallpaper_id FROM downloads WHERE user_id = $1 GROUP BY wallpaper_id ORDER BY max(created_at) DESC', [userId]);
      return rows.map((r) => r.wallpaper_id);
    },
    async counts() {
      await init();
      const [l, d] = await Promise.all([
        q('SELECT wallpaper_id, count(*)::int AS n FROM likes GROUP BY wallpaper_id'),
        q('SELECT wallpaper_id, count(*)::int AS n FROM downloads GROUP BY wallpaper_id'),
      ]);
      const toMap = (rows) => Object.fromEntries(rows.map((r) => [r.wallpaper_id, r.n]));
      return { likes: toMap(l.rows), downloads: toMap(d.rows) };
    },
    async totals() {
      await init();
      const { rows } = await q(`SELECT
        (SELECT count(*)::int FROM users) AS users,
        (SELECT count(*)::int FROM likes) AS likes,
        (SELECT count(*)::int FROM downloads) AS downloads`);
      return rows[0];
    },
  };
}

// -------------------------------------------------------------------- JSON
function jsonStore(dir) {
  const file = path.join(dir, 'db.json');
  const load = () => {
    try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
    catch { return { users: [], likes: [], downloads: [] }; }
  };
  const save = (db) => fs.writeFileSync(file, JSON.stringify(db, null, 2));
  const user = (u) => u && { id: u.id, name: u.name, email: u.email, createdAt: u.createdAt };

  return {
    kind: 'json',
    async init() { fs.mkdirSync(dir, { recursive: true }); },
    async createUser({ name, email }) {
      const db = load();
      if (db.users.some((u) => norm(u.email) === norm(email))) return null;
      const u = { id: db.users.reduce((m, x) => Math.max(m, x.id), 0) + 1, name, email: norm(email), createdAt: new Date().toISOString() };
      db.users.push(u);
      save(db);
      return user(u);
    },
    async findUserByEmail(email) { return user(load().users.find((u) => norm(u.email) === norm(email))); },
    async findUserById(id) { return user(load().users.find((u) => u.id === id)); },
    async toggleLike(userId, wid) {
      const db = load();
      const i = db.likes.findIndex((l) => l.userId === userId && l.wid === wid);
      if (i >= 0) { db.likes.splice(i, 1); save(db); return { liked: false }; }
      db.likes.push({ userId, wid, at: new Date().toISOString() });
      save(db);
      return { liked: true };
    },
    async likedIds(userId) { return load().likes.filter((l) => l.userId === userId).map((l) => l.wid).reverse(); },
    async recordDownload(userId, wid) {
      const db = load();
      db.downloads.push({ userId, wid, at: new Date().toISOString() });
      save(db);
    },
    async downloadedIds(userId) {
      const seen = new Set();
      return load().downloads.filter((d) => d.userId === userId).reverse()
        .map((d) => d.wid).filter((w) => !seen.has(w) && seen.add(w));
    },
    async counts() {
      const db = load();
      const tally = (rows) => rows.reduce((m, r) => ((m[r.wid] = (m[r.wid] || 0) + 1), m), {});
      return { likes: tally(db.likes), downloads: tally(db.downloads) };
    },
    async totals() {
      const db = load();
      return { users: db.users.length, likes: db.likes.length, downloads: db.downloads.length };
    },
  };
}

function createStore({ dataDir, databaseUrl }) {
  return databaseUrl ? postgresStore(databaseUrl) : jsonStore(dataDir);
}

module.exports = { createStore };
