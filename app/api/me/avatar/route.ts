// The browser shrinks the photo before sending it; here it's checked to really be an image,
// cropped square to 256px and stored as a small webp (roughly 10-25KB) in the database.
import { NextResponse } from 'next/server';
import sharp from 'sharp';
import { store } from '@/lib/store';
import { publicUser } from '@/lib/session';
import { fail, requireUser } from '@/lib/http';

const MAX_BYTES = 4 * 1024 * 1024;

export async function PUT(req: Request) {
  const { user, denied } = await requireUser();
  if (denied) return denied;
  if (!String(req.headers.get('content-type') || '').startsWith('image/')) return fail(400, 'Please choose an image');
  const body = Buffer.from(await req.arrayBuffer());
  if (!body.length) return fail(400, 'Please choose an image');
  if (body.length > MAX_BYTES) return fail(413, 'That photo is too large');
  let data: Buffer;
  try {
    data = await sharp(body).rotate().resize(256, 256, { fit: 'cover' }).webp({ quality: 82 }).toBuffer();
  } catch {
    return fail(400, "That file isn't an image we can read");
  }
  await store.setAvatar(user.id, data);
  return NextResponse.json({ user: publicUser(await store.findUserById(user.id)) });
}

export async function DELETE() {
  const { user, denied } = await requireUser();
  if (denied) return denied;
  await store.setAvatar(user.id, null);
  return NextResponse.json({ user: publicUser(await store.findUserById(user.id)) });
}
