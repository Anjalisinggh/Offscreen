// Starts "Continue with Google": remembers a random state (checked on the way back, so the
// callback can't be triggered by another site) and where to return to, then goes to Google.
import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { googleEnabled, consentUrl } from '@/lib/google';
import { IS_SERVERLESS } from '@/lib/store';

export async function GET(req: Request) {
  const back = new URL(req.url).searchParams.get('returnTo') || '/';
  const returnTo = back.startsWith('/') && !back.startsWith('//') ? back : '/';
  if (!googleEnabled()) return NextResponse.redirect(new URL('/?signin=google-off', req.url));

  const state = crypto.randomBytes(24).toString('base64url');
  const res = NextResponse.redirect(consentUrl(req, state));
  const opts = { httpOnly: true, sameSite: 'lax' as const, secure: IS_SERVERLESS, path: '/', maxAge: 600 };
  res.cookies.set('g_state', state, opts);
  res.cookies.set('g_return', returnTo, opts);
  return res;
}
