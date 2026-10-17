// Served at /sitemap.xml: every page and wallpaper (with its picture, for Google Images), so search
// engines can find each one.
import type { MetadataRoute } from 'next';
import wallpapersJson from '@/data/wallpapers.json';
import categoriesJson from '@/data/categories.json';
import { moodPath, wallpaperPath } from '@/lib/client';
import { displayUrl } from '@/lib/media';
import type { Wallpaper, Category } from '@/lib/types';

export const SITE_URL = 'https://offscreen.wtf';

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = ['', '/explore', '/recent', '/categories', '/about', '/privacy'].map((path) => ({ url: `${SITE_URL}${path}` }));
  const categories = (categoriesJson as Category[]).map((c) => ({ url: `${SITE_URL}${moodPath(c.name)}` }));
  const wallpapers = (wallpapersJson as Wallpaper[]).map((w) => ({ url: `${SITE_URL}${wallpaperPath(w)}`, lastModified: w.createdAt, images: [displayUrl(w)] }));
  return [...pages, ...categories, ...wallpapers];
}
