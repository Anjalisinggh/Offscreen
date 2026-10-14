import { store } from '@/lib/store';
import { avatarType } from '@/lib/avatar-type';

// the URL carries the photo's version (?v=), so it can be cached for good
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const data = await store.getAvatar(Number((await params).id));
  if (!data) return new Response(null, { status: 404 });
  return new Response(new Uint8Array(data), {
    headers: {
      'Content-Type': avatarType(data) || 'image/webp', 'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
