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
    -- profile photos: a small webp stored right on the user row
    ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar BYTEA;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_updated_at TIMESTAMPTZ;
    -- one pending sign-up/log-in code per email; only a hash of the code is kept
    CREATE TABLE IF NOT EXISTS email_codes (
      email      TEXT        PRIMARY KEY,
      code_hash  TEXT        NOT NULL,
      purpose    TEXT        NOT NULL,
      name       TEXT,
      attempts   INTEGER     NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      expires_at TIMESTAMPTZ NOT NULL
    );
    -- one row per code email sent, keyed by a hash of the visitor's IP, for the per-visitor limit
    CREATE TABLE IF NOT EXISTS code_sends (
      ip_hash    TEXT        NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS code_sends_ip_idx ON code_sends (ip_hash, created_at);
  `).catch((e) => { ready = null; throw e; }));

  const COLS = 'id, name, email, created_at, avatar_updated_at';
  const user = (r) => r && { id: Number(r.id), name: r.name, email: r.email, createdAt: r.created_at, avatarUpdatedAt: r.avatar_updated_at };

  return {
    kind: 'postgres',
    init,
    async createUser({ name, email }) {
      await init();
      const { rows } = await q(
        `INSERT INTO users (name, email) VALUES ($1, $2) ON CONFLICT DO NOTHING RETURNING ${COLS}`,
        [name, norm(email)]);
      return rows[0] ? user(rows[0]) : null; // null = that email already has an account
    },
    async findUserByEmail(email) {
      await init();
      const { rows } = await q(`SELECT ${COLS} FROM users WHERE lower(email) = $1`, [norm(email)]);
      return user(rows[0]);
    },
    async findUserById(id) {
      await init();
      const { rows } = await q(`SELECT ${COLS} FROM users WHERE id = $1`, [id]);
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
    async setAvatar(userId, data) {
      await init();
      await q('UPDATE users SET avatar = $2, avatar_updated_at = CASE WHEN $2::bytea IS NULL THEN NULL ELSE now() END WHERE id = $1', [userId, data]);
    },
    async getAvatar(userId) {
      await init();
      const { rows } = await q('SELECT avatar FROM users WHERE id = $1 AND avatar IS NOT NULL', [userId]);
      return rows[0] ? rows[0].avatar : null;
    },
    async saveCode({ email, codeHash, purpose, name, ttlMs }) {
      await init();
      await q(`INSERT INTO email_codes (email, code_hash, purpose, name, attempts, created_at, expires_at)
               VALUES ($1, $2, $3, $4, 0, now(), now() + ($5 || ' milliseconds')::interval)
               ON CONFLICT (email) DO UPDATE SET code_hash = $2, purpose = $3, name = $4, attempts = 0,
                 created_at = now(), expires_at = now() + ($5 || ' milliseconds')::interval`,
        [norm(email), codeHash, purpose, name || null, String(ttlMs)]);
    },
    async getCode(email) {
      await init();
      const { rows } = await q('SELECT * FROM email_codes WHERE email = $1', [norm(email)]);
      const r = rows[0];
      return r && { email: r.email, codeHash: r.code_hash, purpose: r.purpose, name: r.name, attempts: r.attempts,
        createdAt: new Date(r.created_at).getTime(), expiresAt: new Date(r.expires_at).getTime() };
    },
    async bumpCodeAttempts(email) {
      await init();
      await q('UPDATE email_codes SET attempts = attempts + 1 WHERE email = $1', [norm(email)]);
    },
    async deleteCode(email) {
      await init();
      await q('DELETE FROM email_codes WHERE email = $1', [norm(email)]);
    },
    async countCodeSends(ipHash, windowMs) {
      await init();
      const { rows } = await q(`SELECT count(*)::int AS n, min(created_at) AS oldest FROM code_sends
                                WHERE ip_hash = $1 AND created_at > now() - ($2 || ' milliseconds')::interval`,
        [ipHash, String(windowMs)]);
      return { count: rows[0].n, oldest: rows[0].oldest ? new Date(rows[0].oldest).getTime() : null };
    },
    async recordCodeSend(ipHash) {
      await init();
      await q('INSERT INTO code_sends (ip_hash) VALUES ($1)', [ipHash]);
      await q("DELETE FROM code_sends WHERE created_at < now() - interval '1 day'");
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
    catch { return { users: [], likes: [], downloads: [], codes: {} }; }
  };
  const save = (db) => fs.writeFileSync(file, JSON.stringify(db, null, 2));
  const user = (u) => u && { id: u.id, name: u.name, email: u.email, createdAt: u.createdAt, avatarUpdatedAt: u.avatarUpdatedAt || null };

  return {
    kind: 'json',
    async init() { fs.mkdirSync(dir, { recursive: true }); },
    async createUser({ name, email }) {
      const db = load();
      if (db.users.some((u) => norm(u.email) === norm(email))) return null;
      // like a Postgres sequence, never hand out an id again, even after an account is deleted
      db.lastUserId = Math.max(db.lastUserId || 0, db.users.reduce((m, x) => Math.max(m, x.id), 0)) + 1;
      const u = { id: db.lastUserId, name, email: norm(email), createdAt: new Date().toISOString() };
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
    async setAvatar(userId, data) {
      const db = load();
      const u = db.users.find((x) => x.id === userId);
      if (!u) return;
      u.avatar = data ? data.toString('base64') : null;
      u.avatarUpdatedAt = data ? new Date().toISOString() : null;
      save(db);
    },
    async getAvatar(userId) {
      const u = load().users.find((x) => x.id === userId);
      return u && u.avatar ? Buffer.from(u.avatar, 'base64') : null;
    },
    async saveCode({ email, codeHash, purpose, name, ttlMs }) {
      const db = load();
      db.codes = db.codes || {};
      db.codes[norm(email)] = { email: norm(email), codeHash, purpose, name: name || null, attempts: 0, createdAt: Date.now(), expiresAt: Date.now() + ttlMs };
      save(db);
    },
    async getCode(email) { return (load().codes || {})[norm(email)] || null; },
    async bumpCodeAttempts(email) {
      const db = load();
      const c = (db.codes || {})[norm(email)];
      if (c) { c.attempts += 1; save(db); }
    },
    async deleteCode(email) {
      const db = load();
      if (db.codes) { delete db.codes[norm(email)]; save(db); }
    },
    async countCodeSends(ipHash, windowMs) {
      const since = Date.now() - windowMs;
      const times = (load().codeSends || []).filter((s) => s.ipHash === ipHash && s.at > since).map((s) => s.at);
      return { count: times.length, oldest: times.length ? Math.min(...times) : null };
    },
    async recordCodeSend(ipHash) {
      const db = load();
      const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
      db.codeSends = (db.codeSends || []).filter((s) => s.at > dayAgo);
      db.codeSends.push({ ipHash, at: Date.now() });
      save(db);
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
