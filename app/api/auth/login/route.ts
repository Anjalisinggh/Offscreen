// Log in with email + password, no code. After 10 wrong passwords for an email in 15 minutes,
// that email is paused for the rest of the window (resetting the password clears it).
import { NextResponse } from 'next/server';
import { store } from '@/lib/store';
import { startSession, publicUser } from '@/lib/session';
import { fail, readJson } from '@/lib/http';
import { verifyPassword } from '@/lib/password';
import { cleanEmail } from '@/lib/auth-codes';

const MAX_FAILS = 10;
const FAIL_WINDOW_MS = 15 * 60 * 1000;
const WRONG = 'That email and password don’t match.';

export async function POST(req: Request) {
  const body = await readJson(req);
  const email = cleanEmail(body.email);
  const password = String(body.password || '');
  if (!email || !password) return fail(400, 'Please enter your email and password');

  if (await store.countFailedLogins(email, FAIL_WINDOW_MS) >= MAX_FAILS) {
    return fail(429, 'Too many wrong passwords. Please try again in 15 minutes, or reset your password.');
  }
  const user = await store.findUserByEmail(email);
  if (!user) return fail(404, 'No account with that email yet. Sign up first.');
  const hash = await store.getPasswordHash(user.id);
  // accounts made before passwords existed set one with an emailed code
  if (!hash) return fail(409, 'Your account doesn’t have a password yet. Use “Forgot password?” to set one.', { needsPassword: true });

  if (!(await verifyPassword(password, hash))) {
    await store.recordFailedLogin(email);
    return fail(401, WRONG);
  }
  await store.clearFailedLogins(email);
  const res = NextResponse.json({ user: publicUser(user) });
  startSession(res, user);
  return res;
}
