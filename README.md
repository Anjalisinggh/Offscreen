# Offscreen

**A collection for your screen.**

**Live:** [offscreen.wtf](https://offscreen.wtf)

Offscreen is a small wallpaper gallery. Browse, like and download phone and desktop wallpapers, organized into collections by mood — Retro, Dark, Minimal, Motivational, Cute, Abstract, Nature, Pink, Vintage, Psychedelic. The wallpaper list lives in `data/wallpapers.json` and the images on Cloudinary; accounts, likes and downloads live in a Postgres database.

![Next.js](https://img.shields.io/badge/Next.js-16-3b1f2c) ![TypeScript](https://img.shields.io/badge/TypeScript-5-c25a7c) ![License](https://img.shields.io/badge/license-MIT-c25a7c)

## Features

- **Browse without an account.** Anyone can explore and search. An account is needed to like or download.
- **Verified accounts with passwords.** Sign up with a name, email and password, then enter the 6-digit code emailed to you once. After that, log in with email and password. "Forgot password?" emails a code to set a new one.
- **Profile photos.** Members can add, change or remove a photo; it's cropped to 256px and stored in the database.
- **Every download is recorded** against the person who made it, and shows up in their profile under Downloads.
- **Phone and desktop wallpapers**, detected automatically by image aspect ratio. Each wallpaper opens in a realistic preview — an iPhone mockup with a live lock screen clock, or a MacBook mockup with a menu bar and dock.
- **Collections and search** by style, plus tag-based discovery ("you might also like").
- **Light and dark themes**, remembered per browser.
- **Fast to load.** Pages are rendered on the server, and every wallpaper is served from Cloudinary as a small thumbnail for grid cards and a mid-size image for the wallpaper page, in AVIF or WebP; the original file is only sent for the actual Download.

## Getting started

```bash
npm install
npm run dev
```

Then open **http://localhost:3000**. Copy `.env.example` to `.env` and fill in what you need; at minimum `CLOUDINARY_URL`, or no images load.

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

Passwords are only stored as scrypt hashes. Codes expire after 10 minutes, allow 5 tries, can be re-sent every 30 seconds, and only a hash of each code is stored. Each visitor can have at most 5 codes emailed per 10 minutes, whichever addresses they enter, so the mail quota can't be used up by one person.

Codes are sent over SMTP. Set `SMTP_URL` and `MAIL_FROM`:

| Provider | `SMTP_URL` |
|---|---|
| Gmail (needs an [app password](https://myaccount.google.com/apppasswords)) | `smtps://you%40gmail.com:APP_PASSWORD@smtp.gmail.com:465` |
| Resend | `smtps://resend:RESEND_API_KEY@smtp.resend.com:465` |
| Brevo | `smtp://LOGIN:SMTP_KEY@smtp-relay.brevo.com:587` |

`MAIL_FROM` is the sender, e.g. `Offscreen <you@gmail.com>`. Note the `@` in a Gmail address is written `%40` inside the URL. On Vercel without `SMTP_URL`, sign-up shows "Sign-in emails aren't set up on this site yet".

## Images (Cloudinary)

Wallpaper images live on Cloudinary, not in this repo. Set `CLOUDINARY_URL` (Cloudinary dashboard → API Keys → "API environment variable") locally in `.env` and on Vercel.

They're uploaded as **authenticated** assets, so nothing can be fetched from Cloudinary without a URL signed with the API secret. The server signs exactly three kinds of URL (`lib/media.ts`): a 520px card thumbnail, an 1100px preview for the wallpaper page, and — only for a signed-in user pressing Download — the original. Cloudinary picks AVIF or WebP for the previews. Each image is re-encoded without its metadata before upload. Right-click "Save image" and dragging are turned off on wallpaper images, and the previews it would save are only the smaller sizes anyway.

## Adding your own wallpapers

Drop new images into the parent folder of this project, then run:

```bash
npm run generate-data
```

This uploads each new image to Cloudinary (without its metadata), detects phone vs. desktop by aspect ratio, and appends it to `data/wallpapers.json`. The source file is renamed to the wallpaper's own file name, so no tool- or camera-given name is kept. Edit titles, tags and collections in `data/wallpapers.json` (a phone and desktop version of the same artwork share a `series`), then commit.

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
  media.ts                 Signed Cloudinary URLs
  wallpapers.ts            The wallpaper library, sorting, search and "similar"
scripts/                   generate-data.mts, upload-to-cloudinary.mts
data/                      wallpapers.json, categories.json (committed); db.json (local only, gitignored)
```

## Deploying to Vercel

The project deploys to Vercel as a Next.js app (`vercel.json` sets the framework). Add `DATABASE_URL`, `SMTP_URL`, `MAIL_FROM` and `CLOUDINARY_URL` as described above.

## Tech stack

Next.js (App Router), React, TypeScript, Postgres (`pg`), Nodemailer, Cloudinary. Profile photos and upload clean-up via [sharp](https://sharp.pixelplumbing.com/).

## License

MIT
