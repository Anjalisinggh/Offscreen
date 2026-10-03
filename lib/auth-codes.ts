// Sign-up and log-in both prove the email by sending a 6-digit code to it:
//   1. POST /api/auth/request-code  { mode: 'signup'|'login', email, name? }
//   2. POST /api/auth/verify-code   { email, code }
// Only a hash of the code is stored; it expires after 10 minutes, allows 5 tries, and a new one
// can be requested every 30 seconds. Each visitor (by IP) can have at most 5 codes emailed per
// 10 minutes, whatever addresses they type, so nobody can burn through the mail quota.
import 'server-only';
import crypto from 'crypto';
import { SESSION_SECRET } from './session';

export const CODE_TTL_MS = 10 * 60 * 1000;
export const RESEND_AFTER_MS = 30 * 1000;
export const MAX_TRIES = 5;
export const SENDS_PER_IP = 5;
export const SENDS_WINDOW_MS = 10 * 60 * 1000;

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const cleanEmail = (v: unknown) => String(v || '').trim().toLowerCase();

export const hashCode = (email: string, code: string) => crypto.createHmac('sha256', SESSION_SECRET).update(`${email}:${code}`).digest('hex');
export const newCode = () => String(crypto.randomInt(0, 1000000)).padStart(6, '0');

// Vercel sets x-real-ip / x-forwarded-for itself; only a hash of the IP is stored
export const clientIp = (req: Request) =>
  req.headers.get('x-real-ip') || String(req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'local';
export const hashIp = (ip: string) => crypto.createHmac('sha256', SESSION_SECRET).update(`ip:${ip}`).digest('hex');
