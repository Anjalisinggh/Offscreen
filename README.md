# Offscreen

**A collection for your screen.**

**Live:** [offscreen.wtf](https://offscreen.wtf)

Offscreen is a small wallpaper gallery. Browse, like and download phone and desktop wallpapers, organized into collections by mood — Retro, Dark, Minimal, Motivational, Cute, Abstract, Nature, Pink, Vintage, Psychedelic. The wallpaper list lives in `data/wallpapers.json` and the images on Cloudflare R2; accounts, likes and downloads live in a Postgres database.

![Next.js](https://img.shields.io/badge/Next.js-16-3b1f2c) ![TypeScript](https://img.shields.io/badge/TypeScript-5-c25a7c) ![License](https://img.shields.io/badge/license-MIT-c25a7c)

## Features

- **Browse without an account.** Anyone can explore and search. An account is needed to like or download.
- **Verified accounts with passwords.** Sign up with a name, email and password, then enter the 6-digit code emailed to you once. After that, log in with email and password. "Forgot password?" emails a code to set a new one.
- **Profile photos.** Members can add, change or remove a photo; it's cropped to 256px and stored in the database.
- **Every download is recorded** against the person who made it, and shows up in their profile under Downloads.
- **Phone and desktop wallpapers**, detected automatically by image aspect ratio. Each wallpaper opens in a realistic preview — an iPhone mockup with a live lock screen clock, or a MacBook mockup with a menu bar and dock.
- **Collections and search** by style, plus tag-based discovery ("you might also like").
- **Light and dark themes**, remembered per browser.
- **Fast to load.** Pages are rendered on the server, and every wallpaper is served from Cloudflare R2 as a small thumbnail for grid cards and a mid-size image for the wallpaper page, in WebP; the original file is only sent for the actual Download.

## Getting started

```bash
npm install
npm run dev
```

Then open **http://localhost:3000**. Copy `.env.example` to `.env` and fill in what you need; at minimum `IMAGES_URL`, or no images load.

With no `DATABASE_URL`, accounts, likes and downloads are kept in `data/db.json` (gitignored), and with no `SMTP_URL` the sign-up code is printed in the terminal instead of emailed, so local development needs nothing else.

`npm run build` checks types and builds the production site; `npm run typecheck` only checks types.

## Database

Set `DATABASE_URL` to any Postgres connection string and the app uses it instead of `data/db.json`. The tables are created (and new columns added) automatically on first use — there's no migration step.

**On Vercel**, the quickest way is: Vercel dashboard → your project → **Storage** → **Create Database** → **Neon (Postgres)**, and connect it to the project. That sets `DATABASE_URL` for you.

`SESSION_SECRET` (optional) signs the login cookie. If it's unset, a secret is derived from `DATABASE_URL`.

| Table | What's in it |
|---|---|
| `users` | id, name, email (unique, case-insensitive), password_hash (scrypt), created_at, avatar (256px webp), avatar_updated_at |
| `email_codes` | one pending sign-up or password-reset code per email (hashed), with expiry and try count; a sign-up keeps its chosen password hash here until verified |
| `code_sends` | a hashed visitor IP and time for each code emailed, kept for a day, for the per-visitor limit |
| `failed_logins` | email and time of each wrong password, kept for a day, for slowing down guessing |
| `likes` | user_id, wallpaper_id, created_at — one row per like, removed on unlike |
| `downloads` | id, user_id, wallpaper_id, created_at — one row per download |

The `likes` and `downloads` numbers in `data/wallpapers.json` are starting totals; the counts shown on the site are those plus the rows in the database.

## Accounts and emails

- **Sign up**: name, email, password (8+ characters) → a 6-digit code is emailed → entering it creates the account.
- **Log in**: email + password, no code. After 10 wrong passwords for an email in 15 minutes, that email is paused for the rest of the 15 minutes; resetting the password clears it.
- **Forgot password**: a code is emailed and entered together with the new password. Accounts made before passwords existed use this once to set one.
- **Continue with Google**: signs in the account with the same (Google-verified) email, or creates one with the Google name; no code or password needed. The button only shows when `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set — create them in Google Cloud → APIs & Services → Credentials → OAuth client ID (Web application), with `https://<your site>/api/auth/google/callback` as an authorized redirect URI.

Passwords are only stored as scrypt hashes. Codes expire after 10 minutes, allow 5 tries, can be re-sent every 30 seconds, and only a hash of each code is stored. Each visitor can have at most 5 codes emailed per 10 minutes, whichever addresses they enter, so the mail quota can't be used up by one person.

Codes are sent over SMTP. Set `SMTP_URL` and `MAIL_FROM`:

| Provider | `SMTP_URL` |
|---|---|
| Gmail (needs an [app password](https://myaccount.google.com/apppasswords)) | `smtps://you%40gmail.com:APP_PASSWORD@smtp.gmail.com:465` |
| Resend | `smtps://resend:RESEND_API_KEY@smtp.resend.com:465` |
| Brevo | `smtp://LOGIN:SMTP_KEY@smtp-relay.brevo.com:587` |

`MAIL_FROM` is the sender, e.g. `Offscreen <you@gmail.com>`. Note the `@` in a Gmail address is written `%40` inside the URL. On Vercel without `SMTP_URL`, sign-up shows "Sign-in emails aren't set up on this site yet".

## Images (Cloudflare R2)

Wallpaper images live in two Cloudflare R2 buckets, not in this repo (R2's free tier covers 10 GB and has no charge for traffic):

- **`offscreen-images`** (public, at `https://images.offscreen.wtf`): only the smaller sizes the site shows, made once at upload with sharp: a 520px card thumbnail, an 1100px preview, a 1200×630 link-preview picture, a 1000px picture for sharing, and small tiles. WebP for the site, JPEG where other apps take the picture.
- **`offscreen-originals`** (private): the original files. The server signs a 5-minute link to one (`lib/media.ts`) only for a signed-in user pressing Download.

Each image is re-encoded without its metadata before upload. Right-click "Save image" and dragging are turned off on wallpaper images, and the previews it would save are only the smaller sizes anyway.

Setting it up (once):

1. `npx wrangler login`, then `npx wrangler r2 bucket create offscreen-images` and `npx wrangler r2 bucket create offscreen-originals`.
2. `npx wrangler r2 bucket domain add offscreen-images --domain images.offscreen.wtf --zone-id <zone id>` (the domain must be on Cloudflare), and `npx wrangler r2 bucket cors set <bucket> --file r2-cors.json` on both buckets, so the site can read the pictures' pixels and fetch Downloads.
3. Cloudflare dashboard → **R2 → Manage API tokens → Create API token**, "Object Read & Write" on those two buckets. Put the account ID, access key ID and secret in `.env` as `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, with `IMAGES_URL=https://images.offscreen.wtf`, and add the same four on Vercel.
4. `npm run upload-images` uploads every wallpaper in `data/wallpapers.json` from its source file in the parent folder. Re-running skips what's already there; `--force` re-uploads everything.

## Adding your own wallpapers

Drop new images into the parent folder of this project, then run:

```bash
npm run generate-data
```

This uploads each new image to Cloudflare R2 (without its metadata), detects phone vs. desktop by aspect ratio, and appends it to `data/wallpapers.json`. The source file is renamed to the wallpaper's own file name, so no tool- or camera-given name is kept. Edit titles, tags and collections in `data/wallpapers.json` (a phone and desktop version of the same artwork share a `series`), then commit.

## Project structure

```
app/                       Pages (server-rendered) and API route handlers
  layout.tsx               Shell: top bar, footer, preloader, signed-in user
  page.tsx                 Home; explore/, categories/, search/, likes/, profile/, wallpaper/[id]/
  api/                     auth (request-code, verify-code, login, logout, me), me/, avatars/, wallpapers/[id]/
  globals.css              Design system (light + dark themes)
components/                React components: cards, masonry grid, sign-in dialog, wallpaper page, …
lib/
  store.ts                 Accounts, passwords, photos, codes, likes, downloads: Postgres or data/db.json
  session.ts, password.ts  Login cookie and password hashing
  mailer.ts                Sends codes over SMTP
  media.ts                 Image URLs on R2, signed Download links
  wallpapers.ts            The wallpaper library, sorting, search and "similar"
scripts/                   generate-data.mts, upload-to-r2.mts
data/                      wallpapers.json, categories.json (committed); db.json (local only, gitignored)
```

## Deploying

Production is split in two, so a traffic spike lands on the parts that don't charge per request:

| Where | What | Address |
|---|---|---|
| **Cloudflare Workers** (OpenNext, `wrangler.jsonc`) | the pages and their JS/CSS; no database | offscreen.wtf, www.offscreen.wtf |
| **Our server** (pm2, `server/ecosystem.config.cjs`) | this same app answering `/api/*`: accounts, likes, downloads, profile photos, the PostHog proxy (`/ph`); Postgres; the original files | api.offscreen.wtf |
| **Our server** (`server/images.mjs`) | the public wallpaper images | images.offscreen.wtf |

The browser calls `https://api.offscreen.wtf` directly with the login cookie (same site, so it's sent), and only `SITE_ORIGIN` is allowed by CORS. The pages fetch the like/download totals from `/api/counts` (cached a minute) and load who is signed in in the browser (`/api/auth/me`). Both hosts sit behind Cloudflare (orange cloud, SSL Full (strict)); images, avatars and `/api/counts` are cached there.

**API server** (`~/apps/offscreen`): `.env.production` with `DATABASE_URL`, `SESSION_SECRET`, `SMTP_URL`, `MAIL_FROM`, `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`, `IMAGES_URL=https://images.offscreen.wtf`, `NEXT_PUBLIC_API_URL=https://api.offscreen.wtf`, `SITE_ORIGIN=https://offscreen.wtf`, `ORIGINALS_DIR=~/data/originals`; images in `~/data/images`. Then `npm ci && npm run build && pm2 start server/ecosystem.config.cjs && pm2 save`. Postgres runs in podman on 127.0.0.1:4150. "Continue with Google" needs `https://api.offscreen.wtf/api/auth/google/callback` as a redirect URI.

**Pages**: build with `NEXT_PUBLIC_API_URL=https://api.offscreen.wtf`, `IMAGES_URL=https://images.offscreen.wtf` and `NEXT_PUBLIC_POSTHOG_KEY`, then `npm run deploy`. The build creates symlinks, which Windows only allows with Developer Mode on; otherwise build on Linux (the API server works).

`scripts/mirror-r2.mts` copies the old R2 buckets to a folder, for moving the images onto the server.

## Tech stack

Next.js (App Router), React, TypeScript, Postgres (`pg`), Nodemailer or Resend, Cloudflare R2. Pages on Cloudflare Workers, API and images on our own server. Wallpaper upload clean-up via [sharp](https://sharp.pixelplumbing.com/); profile photos are cropped in the browser.

## License

MIT
