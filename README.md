# Offscreen

**A collection for your screen.**

Offscreen is a small, self-hosted wallpaper gallery. Browse, like and download phone and desktop wallpapers, organized into collections by mood — Retro, Dark, Minimal, Motivational, Cute, Abstract, Nature, Pink, Vintage, Psychedelic. The wallpapers themselves live in `data/wallpapers.json`; accounts, likes and downloads live in a Postgres database.

![Node](https://img.shields.io/badge/node-%3E%3D18-3b1f2c) ![License](https://img.shields.io/badge/license-MIT-c25a7c)

## Features

- **Browse without an account.** Anyone can explore and search. An account is needed to like or download.
- **Verified accounts, no passwords.** Sign up with a name and email, then enter the 6-digit code emailed to you; logging in later works the same way with just the email.
- **Profile photos.** Members can add, change or remove a photo; it's cropped to 256px and stored in the database.
- **Every download is recorded** against the person who made it, and shows up in their profile under Downloads.
- **Phone and desktop wallpapers**, detected automatically by image aspect ratio. Each wallpaper opens in a realistic preview — an iPhone mockup with a live lock screen clock, or a MacBook mockup with a menu bar and dock.
- **Collections and search** by style, plus tag-based discovery ("you might also like").
- **Light and dark themes**, remembered per browser.
- **Fast to load.** Every wallpaper is served as a small thumbnail for grid cards and a mid-size image for the wallpaper page, each in AVIF with a WebP fallback; the original file is only sent for the actual Download.

## Getting started

```bash
npm install
npm start
```

Then open **http://localhost:3000** (or set `PORT`).

With no `DATABASE_URL`, accounts, likes and downloads are kept in `data/db.json` (gitignored), so local development needs no setup.

## Database

Set `DATABASE_URL` to any Postgres connection string and the app uses it instead of `data/db.json`. The tables (`users`, `likes`, `downloads`) are created automatically on first start — there's no migration step.

**On Vercel**, the quickest way is: Vercel dashboard → your project → **Storage** → **Create Database** → **Neon (Postgres)**, and connect it to the project. That sets `DATABASE_URL` for you; redeploy and you're done. A Supabase or Neon project you create yourself works the same way — copy its connection string into the project's environment variables as `DATABASE_URL`.

Without `DATABASE_URL` on Vercel, sign-ups, likes and downloads only live in a short-lived `/tmp` file and are lost.

`SESSION_SECRET` (optional) signs the login cookie. If it's unset, a secret is derived from `DATABASE_URL`.

## Sign-in emails

Sign-up and log-in send a 6-digit code by email. Set `SMTP_URL` and `MAIL_FROM`:

| Provider | `SMTP_URL` |
|---|---|
| Gmail (needs an [app password](https://myaccount.google.com/apppasswords)) | `smtps://you%40gmail.com:APP_PASSWORD@smtp.gmail.com:465` |
| Resend | `smtps://resend:RESEND_API_KEY@smtp.resend.com:465` |
| Brevo | `smtp://LOGIN:SMTP_KEY@smtp-relay.brevo.com:587` |

`MAIL_FROM` is the sender, e.g. `Offscreen <you@gmail.com>`. Note the `@` in a Gmail address is written `%40` inside the URL.

Locally, with no `SMTP_URL`, the code is printed in the server console instead. On Vercel without it, sign-up and log-in show "Sign-in emails aren't set up on this site yet".

Codes expire after 10 minutes, allow 5 tries, can be re-sent every 30 seconds, and only a hash of each code is stored. Each visitor can have at most 5 codes emailed per 10 minutes, whichever addresses they enter, so the mail quota can't be used up by one person.

| Table | What's in it |
|---|---|
| `users` | id, name, email (unique, case-insensitive), created_at, avatar (256px webp), avatar_updated_at |
| `email_codes` | one pending sign-in code per email (hashed), with expiry and try count |
| `code_sends` | a hashed visitor IP and time for each code emailed, kept for a day, for the per-visitor limit |
| `likes` | user_id, wallpaper_id, created_at — one row per like, removed on unlike |
| `downloads` | id, user_id, wallpaper_id, created_at — one row per download |

The `likes` and `downloads` numbers in `data/wallpapers.json` are starting totals; the counts shown on the site are those plus the rows in the database.

## Project structure

```
server.js             Express API + static file server
store.js              Accounts, photos, sign-in codes, likes, downloads: Postgres (DATABASE_URL) or data/db.json
mailer.js             Sends the 6-digit sign-in code over SMTP (SMTP_URL)
generate-data.js      Imports new images from a source folder into public/images + data/wallpapers.json
data/                 wallpapers.json, categories.json (committed); db.json (local only, gitignored)
public/
  index.html          App shell
  css/style.css       Design system (light + dark themes)
  js/app.js           Single-page app: routing, rendering, all interactions
  images/             Full-resolution wallpapers (only sent for Download)
  thumbs/, thumbs-avif/     520px previews for grid cards (WebP + AVIF)
  display/, display-avif/   1100px previews for the wallpaper page and collection tiles
```

The generated preview folders are committed (Vercel's filesystem can't generate them at request time), and are only a fraction of `images/`'s size. They're rebuilt automatically for any new wallpaper when the server starts locally.

## Adding your own wallpapers

Drop new images into the folder `generate-data.js` reads from (see `SRC_DIR` at the top of that file — by default the parent of this project), then run:

```bash
npm run generate-data
```

This copies new images into `public/images`, detects phone vs. desktop by aspect ratio, and appends them to `data/wallpapers.json`. Edit titles, tags and collections in that file, then start the server once to generate the previews, and commit.

## Deploying to Vercel

The project deploys to Vercel as is: `server.js` exports the Express app, and everything in `public/` is served from Vercel's CDN. Add `DATABASE_URL` as described above.

Static files under `public/` bypass the Express app on Vercel, so the `Cache-Control` header `server.js` sets only applies locally. `vercel.json` sets a one-year immutable cache for the image folders; if you replace a wallpaper's image, give the new file a different name rather than overwriting it.

## Tech stack

Node.js, Express, Postgres (`pg`), Nodemailer, and vanilla JavaScript on the front end (no framework, no build step). Image resizing via [sharp](https://sharp.pixelplumbing.com/).

## License

MIT
