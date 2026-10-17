// Served at /robots.txt: lets search engines crawl the gallery (not the API) and points them at the sitemap.
// AI search and assistant crawlers are named too, so it's plain that they're welcome (a crawler named
// in its own group skips the * group, so each gets the same rules).
import type { MetadataRoute } from 'next';
import { SITE_URL } from './sitemap';

const AI_CRAWLERS = [
  'GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-SearchBot', 'Claude-User',
  'PerplexityBot', 'Perplexity-User', 'Google-Extended', 'Applebot-Extended', 'Bingbot', 'meta-externalagent',
];
const RULES = { allow: '/', disallow: ['/api/', '/profile', '/likes'] };

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', ...RULES }, { userAgent: AI_CRAWLERS, ...RULES }],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
