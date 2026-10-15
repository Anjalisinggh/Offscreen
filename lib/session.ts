// Login sessions: name + email to sign up, email alone to log in, both proven by an emailed code.
// The session cookie holds the user id plus an HMAC of it, so it can't be forged or edited.
// With a database the secret is derived from DATABASE_URL (itself secret); set SESSION_SECRET to use
// your own (production does: the value derived from its old Vercel/Neon address, so logins carried over).
import 'server-only';
import crypto from 'crypto';
import { cookies } from 'next/headers';
import type { NextResponse } from 'next/server';
import { store, IS_SERVERLESS, SECURE_COOKIES, type StoredUser } from './store';
import type { PublicUser } from './types';

export const SESSION_SECRET = process.env.SESSION_SECRET
  || (process.env.DATABASE_URL ? crypto.createHash('sha256').update('offscreen-session:' + process.env.DATABASE_URL).digest('hex')
    : IS_SERVERLESS ? crypto.randomBytes(32).toString('hex') : 'offscreen-local-dev-secret');
const sign = (v: string) => crypto.createHmac('sha256', SESSION_SECRET).update(v).digest('base64url');

export function startSession(res: NextResponse, user: StoredUser) {
  const id = String(user.id);
  res.cookies.set('sid', `${id}.${sign(id)}`, {
    httpOnly: true, sameSite: 'lax', secure: SECURE_COOKIES, path: '/', maxAge: 60 * 60 * 24 * 90,
  });
}
export function endSession(res: NextResponse) {
  res.cookies.set('sid', '', { path: '/', maxAge: 0 });
}

export async function currentUser(): Promise<StoredUser | null> {
  const [id, sig] = String((await cookies()).get('sid')?.value || '').split('.');
  if (!id || !sig) return null;
  const good = Buffer.from(sign(id)), given = Buffer.from(sig);
  if (good.length !== given.length || !crypto.timingSafeEqual(good, given)) return null;
  return store.findUserById(Number(id));
}

export const publicUser = (u: StoredUser | null): PublicUser | null => u && {
  id: u.id, name: u.name, email: u.email, createdAt: u.createdAt,
  // on the API server's own address: the pages (another host) don't serve photos
  avatar: u.avatarUpdatedAt ? `${(process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '')}/api/avatars/${u.id}?v=${new Date(u.avatarUpdatedAt).getTime()}` : null,
};
