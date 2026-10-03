import { NextResponse } from 'next/server';
import { store, IS_SERVERLESS } from '@/lib/store';
import { sendCode, canSendEmail } from '@/lib/mailer';
import { fail, readJson } from '@/lib/http';
import {
  CODE_TTL_MS, RESEND_AFTER_MS, SENDS_PER_IP, SENDS_WINDOW_MS,
  EMAIL_RE, cleanEmail, hashCode, newCode, clientIp, hashIp,
} from '@/lib/auth-codes';

export async function POST(req: Request) {
  const body = await readJson(req);
  const mode = body.mode === 'login' ? 'login' : 'signup';
  const email = cleanEmail(body.email);
  const name = String(body.name || '').trim().slice(0, 60);
  if (mode === 'signup' && !name) return fail(400, 'Please enter your name');
  if (!EMAIL_RE.test(email) || email.length > 200) return fail(400, 'Please enter a valid email address');
  if (IS_SERVERLESS && !canSendEmail()) return fail(503, "Sign-in emails aren't set up on this site yet. Please try again later.");

  const existing = await store.findUserByEmail(email);
  if (mode === 'signup' && existing) return fail(409, 'That email already has an account. Log in instead.');
  if (mode === 'login' && !existing) return fail(404, 'No account with that email yet. Sign up first.');

  const pending = await store.getCode(email);
  if (pending && Date.now() - pending.createdAt < RESEND_AFTER_MS) {
    const wait = Math.ceil((RESEND_AFTER_MS - (Date.now() - pending.createdAt)) / 1000);
    return fail(429, `Please wait ${wait}s before asking for another code`, { retryAfter: wait });
  }

  const ipHash = hashIp(clientIp(req));
  const sends = await store.countCodeSends(ipHash, SENDS_WINDOW_MS);
  if (sends.count >= SENDS_PER_IP) {
    const wait = Math.max(1, Math.ceil(((sends.oldest || Date.now()) + SENDS_WINDOW_MS - Date.now()) / 1000));
    const mins = Math.ceil(wait / 60);
    return fail(429, `Too many codes requested. Please try again in ${mins} minute${mins === 1 ? '' : 's'}.`, { retryAfter: wait });
  }

  const code = newCode();
  await store.saveCode({ email, codeHash: hashCode(email, code), purpose: mode, name, ttlMs: CODE_TTL_MS });
  try {
    await sendCode({ to: email, code, purpose: mode });
  } catch (err) {
    console.error('sending code failed:', (err as Error).message);
    await store.deleteCode(email);
    return fail(502, "We couldn't send the email. Please check the address and try again.");
  }
  await store.recordCodeSend(ipHash);
  return NextResponse.json({ ok: true, email, resendAfter: RESEND_AFTER_MS / 1000 });
}
