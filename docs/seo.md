# SEO and AI search

How offscreen.wtf is set up to be found by Google, Bing and AI search (ChatGPT, Claude, Perplexity,
Gemini), and what to check. Nothing here guarantees ranking or an AI recommendation; it makes the
site crawlable, understandable and eligible.

## What's in place

| Piece | Where | What it does |
|---|---|---|
| Titles, descriptions, canonicals | `generateMetadata` / `metadata` in each `app/**/page.tsx` | One title and description per page; canonical on every indexable page (`/explore?category=X` points to `/x-wallpapers`) |
| Open Graph / X cards | same | Each wallpaper and collection shares with its own picture (`og` size from R2) |
| `robots.txt` | `app/robots.ts` | Everything public is crawlable; `/api/`, `/profile`, `/likes` aren't. AI crawlers are named explicitly with the same rules |
| `sitemap.xml` | `app/sitemap.ts` | Pages, collections and every wallpaper, each with its image (Google image sitemap) and `lastmod` from `createdAt` |
| `llms.txt` | `app/llms.txt/route.ts` | Plain-text map of the site for AI assistants, generated from `data/` |
| Structured data | `components/json-ld.tsx` | `WebSite` + `Organization` (layout), `ImageObject` + `BreadcrumbList` (wallpaper), `CollectionPage` + `ItemList` + `BreadcrumbList` (collection), `AboutPage` (about) |
| Cards in the first HTML | `components/grid.tsx` | The grid prints every card before it's measured, so crawlers that don't run JavaScript see wallpapers and links |
| Real links on cards | `components/card.tsx` | Each card's title is an `<a href>`, so grids link through to wallpaper pages |
| Alt text | `imageAlt` in `lib/client.ts` | "Title, mood phone/desktop wallpaper", from the library data |
| `/search` | `app/search/page.tsx` | `noindex, follow`: results pages aren't indexed (Google's advice for internal search) |
| `/about` | `app/about/page.tsx` | What the site is and how downloading works, for visitors and for AI answers |

Cloudflare's "Block AI bots", AI crawl control and managed robots.txt are all **off** for the zone, so
nothing at the edge overrides `robots.txt`.

### AI crawlers: search vs training

`robots.txt` allows everyone (`*`), so naming bots changes nothing today; it documents intent and makes
it a one-line change to treat one differently. They do different jobs:

- **Search / answer crawlers** (help you show up in AI answers): `OAI-SearchBot` (ChatGPT search),
  `ChatGPT-User`, `Claude-SearchBot`, `Claude-User`, `PerplexityBot`, `Perplexity-User`, `Bingbot`
  (also feeds Copilot), `Googlebot` (also feeds AI Overviews; it can't be split from search).
- **Training crawlers** (use pages to train models, no link back): `GPTBot`, `ClaudeBot`,
  `Google-Extended` (Gemini training and grounding), `Applebot-Extended`, `meta-externalagent`.

To keep search but opt out of training, move the training group to `disallow: '/'` in `app/robots.ts`.
That's your call: blocking them doesn't hurt Google/Bing search, but `Google-Extended` also controls
whether Gemini can use the pages for grounded answers.

## Your manual steps

### Google Search Console

1. Go to <https://search.google.com/search-console>, **Add property** → **Domain** → `offscreen.wtf`.
2. Google shows a `google-site-verification=…` TXT record. Add it in Cloudflare → DNS → Records
   (type TXT, name `@`). Then press **Verify**. (Or use a URL-prefix property for
   `https://offscreen.wtf/` and verify with the Google Analytics tag already on the site.)
3. **Sitemaps** → submit `https://offscreen.wtf/sitemap.xml`.
4. **URL inspection** → paste the home page, a collection (`/dark-wallpapers`) and a wallpaper page →
   **Request indexing** for each. Use **Test live URL → View tested page → HTML** to see what Googlebot
   gets.
5. Check back in a few days: **Pages** (indexed vs. not, and why), **Performance** (queries, clicks,
   impressions; filter *Search type: Image* for Google Images), **Enhancements** (breadcrumbs).

### Bing Webmaster Tools

1. Go to <https://www.bing.com/webmasters>, sign in, **Import from Google Search Console** (fastest:
   copies the verified site and sitemap). Otherwise add the site and verify with the CNAME or meta
   tag it gives you.
2. Submit `https://offscreen.wtf/sitemap.xml` under **Sitemaps** if it wasn't imported.
3. Turn on **IndexNow** if offered. Bing's index also feeds Copilot and DuckDuckGo.

### Check structured data

- <https://search.google.com/test/rich-results> and <https://validator.schema.org> with a wallpaper
  page, a collection page and the home page.

## Checking AI discoverability

- [ ] `https://offscreen.wtf/robots.txt`, `/sitemap.xml` and `/llms.txt` load.
- [ ] Search Console shows the wallpaper and collection pages as **Indexed**.
- [ ] Bing Webmaster Tools shows pages indexed (ChatGPT search and Copilot lean on Bing's index).
- [ ] Ask ChatGPT (with search), Perplexity, Gemini and Claude things like "aesthetic dark phone
      wallpaper sites", "Offscreen wallpapers", "offscreen.wtf". Note whether it's mentioned and which
      page is cited. Repeat monthly; it moves slowly.
- [ ] In Google Analytics / PostHog, watch referrers: `chatgpt.com`, `perplexity.ai`,
      `gemini.google.com`, `claude.ai`, `copilot.microsoft.com`. ChatGPT links often carry
      `utm_source=chatgpt.com`.
- [ ] Cloudflare → Analytics → AI Crawl Control (or Security → Bots) shows which AI crawlers visit and
      how often.

## Recommendations (not done)

- **Mentions elsewhere** matter most for AI answers: Pinterest boards per collection (wallpapers do
  well there), a Product Hunt launch, r/wallpapers / r/iphonewallpapers / r/Amoledbackgrounds posts
  that follow each sub's rules, design newsletters and "best wallpaper sites" roundups. One consistent
  description everywhere: *"Offscreen is a curated wallpaper site for phones and desktops, with
  collections sorted by mood and style."*
- **A few useful articles** linking to real collections, e.g. "Dark wallpapers for OLED screens",
  "Minimal home screen setups", "Picking a desktop wallpaper for your setup". A handful written well
  beats many thin ones.
- **Phone / desktop landing pages** (`/phone-wallpapers`, `/desktop-wallpapers`): today these are
  `/explore?device=…`, which are canonicalised to `/explore`. Worth a real page with its own intro
  once there are enough desktop wallpapers.
- **Licence wording**: say on `/about` what people may do with a download (personal use only?). Then
  `ImageObject` can carry `license` / `acquireLicensePage`, which Google Images shows as "Licensable".
- **Performance**: check PageSpeed Insights for a wallpaper page on mobile. The Google Fonts stylesheet
  (four families) and the AdSense script are the likely LCP costs.
