import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { store } from '@/lib/store';
import { startSession, publicUser } from '@/lib/session';
import { fail, readJson } from '@/lib/http';
import { MAX_TRIES, cleanEmail, hashCode } from '@/lib/auth-codes';

export async function POST(req: Request) {
  const body = await readJson(req);
  const email = cleanEmail(body.email);
  const code = String(body.code || '').replace(/\D/g, '');
  const pending = await store.getCode(email);
  if (!pending || Date.now() > pending.expiresAt) {
    if (pending) await store.deleteCode(email);
    return fail(400, 'That code has expired. Please ask for a new one.');
  }
  if (pending.attempts >= MAX_TRIES) {
    await store.deleteCode(email);
    return fail(429, 'Too many wrong tries. Please ask for a new code.');
  }
  const good = Buffer.from(pending.codeHash), given = Buffer.from(hashCode(email, code));
  if (code.length !== 6 || !crypto.timingSafeEqual(good, given)) {
    await store.bumpCodeAttempts(email);
    const left = MAX_TRIES - pending.attempts - 1;
    return fail(400, left > 0 ? `That code isn't right. ${left} ${left === 1 ? 'try' : 'tries'} left.` : 'Too many wrong tries. Please ask for a new code.');
  }
  await store.deleteCode(email);

  let user = await store.findUserByEmail(email);
  if (!user && pending.purpose === 'signup') {
    user = (await store.createUser({ name: pending.name || email.split('@')[0], email })) || await store.findUserByEmail(email);
  }
  if (!user) return fail(404, 'No account with that email yet. Sign up first.');
  const res = NextResponse.json({ user: publicUser(user) });
  startSession(res, user);
  return res;
}
