import { NextResponse } from 'next/server';
import { endSession } from '@/lib/session';

export async function POST() {
  const res = NextResponse.json({ ok: true });
  endSession(res);
  return res;
}
