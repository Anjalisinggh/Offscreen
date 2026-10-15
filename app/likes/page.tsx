import LikesView from '@/components/likes-view';

export const metadata = { title: 'Liked · Offscreen' };

// the list is personal, so it's loaded in the browser from the API (components/likes-view.tsx)
export default function Likes() {
  return <LikesView />;
}
