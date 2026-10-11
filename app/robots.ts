// Served at /robots.txt: lets search engines crawl the gallery (not the API) and points them at the sitemap.
import type { MetadataRoute } from 'next';
import { SITE_URL } from './sitemap';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/api/', '/profile', '/likes'] },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
