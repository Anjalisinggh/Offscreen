// "Continue with Google" (OAuth 2.0 authorization code flow, no extra libraries):
//   /api/auth/google           → sends the browser to Google's consent screen
//   /api/auth/google/callback  → Google sends it back with a code, exchanged here for the
//                                person's verified email and name, then they're signed in
// Needs GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET (Google Cloud → APIs & Services → Credentials →
// OAuth client ID, type "Web application"), with <site>/api/auth/google/callback as a redirect URI.
import 'server-only';

export const googleEnabled = () => !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

export const callbackUrl = (req: Request) => `${new URL(req.url).origin}/api/auth/google/callback`;

export function consentUrl(req: Request, state: string) {
  const q = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: callbackUrl(req),
    response_type: 'code',
    scope: 'openid email profile',
    state,
    prompt: 'select_account',
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${q}`;
}

// the code from the callback → the person's Google profile (only a verified email is accepted)
export async function profileFromCode(req: Request, code: string) {
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: callbackUrl(req),
      grant_type: 'authorization_code',
    }),
  });
  if (!tokenRes.ok) throw new Error(`token exchange failed (${tokenRes.status})`);
  const { access_token } = await tokenRes.json();
  const infoRes = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
    headers: { Authorization: `Bearer ${access_token}` },
  });
  if (!infoRes.ok) throw new Error(`userinfo failed (${infoRes.status})`);
  const info = await infoRes.json() as { email?: string; email_verified?: boolean; name?: string; given_name?: string };
  if (!info.email || !info.email_verified) throw new Error('Google account has no verified email');
  return { email: info.email.toLowerCase(), name: (info.name || info.given_name || info.email.split('@')[0]).slice(0, 60) };
}
