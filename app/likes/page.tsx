import Link from 'next/link';
import { store } from '@/lib/store';
import { currentUser } from '@/lib/session';
import { wallpapersByIds } from '@/lib/wallpapers';
import Grid from '@/components/grid';
import SignInPrompt from '@/components/sign-in-prompt';
import { Arrow } from '@/components/icons';

export const metadata = { title: 'Liked · Offscreen' };

export default async function Likes() {
  const user = await currentUser();
  if (!user) return <SignInPrompt title={<>Your <em>likes</em> live here</>} text="Sign in to keep the wallpapers you love in one place." />;
  const items = await wallpapersByIds(await store.likedIds(user.id));
  return (
    <>
      <div className="page-head">
        <span className="eyebrow reveal">{items.length} saved</span>
        <h1><span className="line-mask"><span>My <em>likes</em></span></span></h1>
      </div>
      <Grid items={items} empty={
        <div className="empty-state"><h3>Nothing <em>liked</em> yet</h3>Tap the heart on any wallpaper to keep it here.<br /><Link className="btn" href="/explore">Start exploring <Arrow /></Link></div>
      } />
    </>
  );
}
