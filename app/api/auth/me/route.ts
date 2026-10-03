import { NextResponse } from 'next/server';
import { currentUser, publicUser } from '@/lib/session';

export async function GET() {
  return NextResponse.json({ user: publicUser(await currentUser()) });
}
