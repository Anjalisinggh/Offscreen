# Offscreen

**A collection for your screen.**

Offscreen is a small, self-hosted wallpaper gallery. Browse, like, save, and download phone and desktop wallpapers, organized into collections by mood — Retro, Dark, Minimal, Motivational, Cute, Abstract, Nature, Pink, Vintage, Psychedelic. Everything is server-rendered from a local `data/wallpapers.json` file, so it's easy to point at your own image folder and make it your own.

![Node](https://img.shields.io/badge/node-%3E%3D18-3b1f2c) ![License](https://img.shields.io/badge/license-MIT-c25a7c)

## Features

- **Browse without an account.** Anyone can explore, search, and download. Signing in (username only, no password) is only needed to like or save wallpapers.
- **Phone and desktop wallpapers**, detected automatically by image aspect ratio. Each wallpaper opens in a realistic preview — an iPhone mockup with a live lock screen clock, or a MacBook mockup with a menu bar and dock — with a toggle between views.
- **Collections and search** by style, plus tag-based discovery ("you might also like").
- **Light and dark themes**, remembered per browser.
- **Admin dashboard** (`/#/admin`) to upload wallpapers, edit titles/tags/collections, feature wallpapers, add new collections, and see like/download stats.
- **Fast to load.** Every wallpaper is served at three sizes: a small WebP thumbnail for grid cards, a mid-size WebP for the wallpaper page and collection tiles, and the original file only for the actual Download button — so a page never pulls multi-megabyte images just to render on screen.

## Getting started

```bash
npm install
npm start
```

Then open **http://localhost:3000**.

## Project structure

```
server.js            Express API + static file server
generate-data.js      Imports new images from a source folder into public/images + data/wallpapers.json
data/                 wallpapers.json, categories.json (committed); likes.json, users.json (runtime, gitignored)
public/
  index.html          App shell
  css/style.css        Design system (light + dark themes)
  js/app.js            Single-page app: routing, rendering, all interactions
  images/               Full-resolution wallpapers (only sent for Download)
  thumbs/               Generated 520px WebP previews for grid/rail cards
  display/              Generated 1100px WebP previews for the wallpaper page and collection tiles
```

`thumbs/` and `display/` are committed (Vercel's filesystem can't generate them at request time), but are only a fraction of `images/`'s size. Both are rebuilt automatically for any new wallpaper when the server starts locally, or right after an admin upload.

## Adding your own wallpapers

Drop new images into the folder `generate-data.js` reads from (see `SRC_DIR` at the top of that file — by default the parent of this project), then run:

```bash
npm run generate-data
```

This copies new images into `public/images`, detects phone vs. desktop by aspect ratio, and appends them to `data/wallpapers.json`. It's safe to re-run: wallpapers that were already imported are left untouched, so any titles/tags/collections you've edited in the admin dashboard are preserved.

You can also upload directly from the admin dashboard at `/#/admin`.

## Admin access

Go to `/#/admin` and sign in with the admin key. The default is `admin123` — set the `ADMIN_KEY` environment variable to change it:

```bash
ADMIN_KEY=your-key-here npm start
```

From the dashboard you can add/edit/delete wallpapers, add collections, feature wallpapers, and see totals for likes, downloads, wallpapers, members, and collections.

## Notes

- "Sign in" is a lightweight username-only flow stored in a cookie. It's enough to gate likes/saves for a project like this, not meant for production auth.
- All data (wallpapers, likes, members, collections) lives in plain JSON files under `data/` — no external database needed.
- `data/likes.json` and `data/users.json` are runtime state, not checked into git; they're created automatically the first time the server starts.

## Deploying to Vercel

The project deploys to Vercel as is: `server.js` exports the Express app, and everything in `public/` (including the committed thumbnails and display images) is served from Vercel's CDN.

Vercel's filesystem is read-only and its functions are short-lived, so on Vercel the data is copied into `/tmp` when a function starts. Browsing, searching and downloading work normally, but **likes, sign-ins and admin edits are not permanent** there, and uploads are turned off. To make them stick, move `data/` into a hosted store such as Vercel KV/Upstash Redis, Postgres, or Vercel Blob for images.

## Tech stack

Node.js, Express, and vanilla JavaScript on the front end (no framework, no build step). Image resizing via [sharp](https://sharp.pixelplumbing.com/).

## License

MIT
