// The browser crops the photo to a 256px square and encodes it (components/profile-view.tsx);
// here it's checked to really be a small webp or JPEG and stored as-is in the database.
import { NextResponse } from 'next/server';
import { store } from '@/lib/store';
import { publicUser } from '@/lib/session';
import { fail, requireUser } from '@/lib/http';
import { avatarType } from '@/lib/avatar-type';

const MAX_BYTES = 200 * 1024; // a 256px photo is ~10-40KB

export async function PUT(req: Request) {
  const { user, denied } = await requireUser();
  if (denied) return denied;
  const body = Buffer.from(await req.arrayBuffer());
  if (!body.length) return fail(400, 'Please choose an image');
  if (body.length > MAX_BYTES) return fail(413, 'That photo is too large');
  if (!avatarType(body)) return fail(400, "That file isn't an image we can read");
  await store.setAvatar(user.id, body);
  return NextResponse.json({ user: publicUser(await store.findUserById(user.id)) });
}

export async function DELETE() {
  const { user, denied } = await requireUser();
  if (denied) return denied;
  await store.setAvatar(user.id, null);
  return NextResponse.json({ user: publicUser(await store.findUserById(user.id)) });
}
