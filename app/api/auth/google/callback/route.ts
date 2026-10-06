// Google sends the browser back here. A matching account (same email) is signed in; otherwise
// one is created with the Google name. Google has already verified the email, so no code is needed.
import { NextResponse, type NextRequest } from 'next/server';
import { profileFromCode } from '@/lib/google';
import { store } from '@/lib/store';
import { startSession } from '@/lib/session';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const returnTo = req.cookies.get('g_return')?.value || '/';
  const back = (result: string) => {
    const to = new URL(returnTo, req.url);
    to.searchParams.set('signin', result);
    const res = NextResponse.redirect(to);
    res.cookies.set('g_state', '', { path: '/', maxAge: 0 });
    res.cookies.set('g_return', '', { path: '/', maxAge: 0 });
    return res;
  };

  const state = url.searchParams.get('state');
  const code = url.searchParams.get('code');
  if (url.searchParams.get('error')) return back('google-cancelled'); // they closed or declined
  if (!code || !state || state !== req.cookies.get('g_state')?.value) return back('google-failed');

  try {
    const { email, name } = await profileFromCode(req, code);
    const user = (await store.findUserByEmail(email))
      || (await store.createUser({ name, email, passwordHash: null }))
      || (await store.findUserByEmail(email));
    if (!user) return back('google-failed');
    await store.clearFailedLogins(email);
    const res = back('google');
    startSession(res, user);
    return res;
  } catch (err) {
    console.error('Google sign-in failed:', (err as Error).message);
    return back('google-failed');
  }
}
