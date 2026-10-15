#!/usr/bin/env bash
# Builds the pages Worker (Cloudflare) on the API server, which builds on Linux (the OpenNext build
# makes symlinks Windows refuses). Run from a copy of the repo with no database settings, e.g.
# ~/apps/offscreen-pages, whose .env.production holds only NEXT_PUBLIC_API_URL, IMAGES_URL and
# NEXT_PUBLIC_POSTHOG_KEY. Leaves a ready bundle in .deploy/ plus .open-next/assets/, which
# `wrangler deploy` uploads as is (see server/wrangler.deploy.jsonc).
set -euo pipefail
cd "$(dirname "$0")/.."
rm -rf .open-next .deploy
npx opennextjs-cloudflare build
# the site-wide link-preview picture is drawn once at build time; drawing it in the Worker takes
# far more CPU time than a request gets, so it's served as a plain file instead
cp .next/server/app/opengraph-image.body .open-next/assets/opengraph-image
printf '/opengraph-image\n  Content-Type: image/png\n  Cache-Control: public, max-age=86400\n' > .open-next/assets/_headers
npx wrangler deploy --dry-run --outdir .deploy
