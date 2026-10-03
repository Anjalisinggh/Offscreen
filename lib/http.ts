import 'server-only';
import { NextResponse } from 'next/server';
import { currentUser } from './session';

export const fail = (status: number, error: string, extra: Record<string, unknown> = {}) =>
  NextResponse.json({ error, ...extra }, { status });

export async function readJson(req: Request): Promise<Record<string, unknown>> {
  try { return await req.json(); } catch { return {}; }
}

// the signed-in user, or a 401 response to return as is
export async function requireUser() {
  const user = await currentUser();
  return user ? { user, denied: null } : { user: null, denied: fail(401, 'Please sign in first') };
}
