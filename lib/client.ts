// Small helpers for the browser side.
import type { PublicWallpaper } from './types';

// a plain-language fallback for when the server didn't send its own message
export function friendlyError(status: number) {
  if (status === 401) return 'Please sign in first';
  if (status === 404) return 'This page is out of date. Please refresh and try again.';
  if (status === 429) return 'Too many tries. Please wait a moment and try again.';
  if (status >= 500) return 'Something went wrong on our side. Please try again in a moment.';
  return 'That didn’t work. Please try again.';
}

export class ApiError extends Error {
  constructor(message: string, public status: number, public retryAfter?: number) { super(message); }
}

export async function api<T = unknown>(path: string, opts: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch('/api' + path, {
      ...opts,
      headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
    });
  } catch {
    throw new ApiError('Can’t reach Offscreen. Check your connection and try again.', 0);
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new ApiError(err.error || friendlyError(res.status), res.status, err.retryAfter);
  }
  return (res.status === 204 ? null : res.json()) as Promise<T>;
}

export const ratio = (w: Pick<PublicWallpaper, 'width' | 'height'>) => (w.width && w.height ? `${w.width} / ${w.height}` : '9 / 16');
export const isDesktop = (w: Pick<PublicWallpaper, 'device'>) => w.device === 'desktop';
export const initial = (name?: string) => (name || '?').trim().charAt(0).toUpperCase();
export const pad = (n: number) => String(n).padStart(2, '0');
export const fmt = (n: number) => (n >= 1000 ? (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k' : String(n));
export const clockTime = (d: Date) => `${d.getHours() % 12 || 12}:${pad(d.getMinutes())}`;

export function timeAgo(iso: string) {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days <= 0) return 'Today';
  if (days === 1) return '1 day';
  if (days < 30) return `${days} days`;
  return `${Math.floor(days / 30)} mo`;
}

export const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
