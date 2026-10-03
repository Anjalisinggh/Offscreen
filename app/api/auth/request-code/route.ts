// Sends a 6-digit code to prove the email is theirs: once at sign-up (with the chosen password,
// which is set on the account when the code is entered) and when resetting a forgotten password.
// Logging in itself is email + password (/api/auth/login), no code.
import { NextResponse } from 'next/server';
import { store, IS_SERVERLESS } from '@/lib/store';
import { sendCode, canSendEmail } from '@/lib/mailer';
import { fail, readJson } from '@/lib/http';
import { hashPassword, passwordProblem } from '@/lib/password';
import {
  CODE_TTL_MS, RESEND_AFTER_MS, SENDS_PER_IP, SENDS_WINDOW_MS,
  EMAIL_RE, cleanEmail, hashCode, newCode, clientIp, hashIp,
} from '@/lib/auth-codes';

export async function POST(req: Request) {
  const body = await readJson(req);
  const mode = body.mode === 'reset' ? 'reset' : 'signup';
  const email = cleanEmail(body.email);
  const name = String(body.name || '').trim().slice(0, 60);
  if (mode === 'signup' && !name) return fail(400, 'Please enter your name');
  if (!EMAIL_RE.test(email) || email.length > 200) return fail(400, 'Please enter a valid email address');
  if (mode === 'signup') {
    const problem = passwordProblem(body.password);
    if (problem) return fail(400, problem);
  }
  if (IS_SERVERLESS && !canSendEmail()) return fail(503, "Sign-in emails aren't set up on this site yet. Please try again later.");

  const existing = await store.findUserByEmail(email);
  if (mode === 'signup' && existing) return fail(409, 'That email already has an account. Log in instead.');
  if (mode === 'reset' && !existing) return fail(404, 'No account with that email yet. Sign up first.');

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
  const passwordHash = mode === 'signup' ? await hashPassword(String(body.password)) : null;
  await store.saveCode({ email, codeHash: hashCode(email, code), purpose: mode, name, passwordHash, ttlMs: CODE_TTL_MS });
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
