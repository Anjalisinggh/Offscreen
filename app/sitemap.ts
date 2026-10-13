// Served at /sitemap.xml: every page and wallpaper, so search engines can find each one.
import type { MetadataRoute } from 'next';
import wallpapersJson from '@/data/wallpapers.json';
import categoriesJson from '@/data/categories.json';
import { moodPath } from '@/lib/client';
import type { Wallpaper, Category } from '@/lib/types';

export const SITE_URL = 'https://offscreen.wtf';

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = ['', '/explore', '/categories', '/search'].map((path) => ({ url: `${SITE_URL}${path}` }));
  const categories = (categoriesJson as Category[]).map((c) => ({ url: `${SITE_URL}${moodPath(c.name)}` }));
  const wallpapers = (wallpapersJson as Wallpaper[]).map((w) => ({ url: `${SITE_URL}/wallpaper/${w.id}`, lastModified: w.createdAt }));
  return [...pages, ...categories, ...wallpapers];
}
