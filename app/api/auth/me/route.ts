import { NextResponse } from 'next/server';
import { currentUser, publicUser } from '@/lib/session';
import { store } from '@/lib/store';
import { googleEnabled } from '@/lib/google';

// who is signed in, what they've liked, and whether "Continue with Google" is on; the browser
// asks once per page load (components/app-context.tsx)
export async function GET() {
  const user = await currentUser();
  return NextResponse.json(
    { user: publicUser(user), likedIds: user ? await store.likedIds(user.id) : [], google: googleEnabled() },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
}
