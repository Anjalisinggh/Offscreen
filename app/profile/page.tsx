import { store } from '@/lib/store';
import { currentUser, publicUser } from '@/lib/session';
import { wallpapersByIds } from '@/lib/wallpapers';
import SignInPrompt from '@/components/sign-in-prompt';
import ProfileView from '@/components/profile-view';

export const metadata = { title: 'Profile · Offscreen' };

export default async function Profile() {
  const user = await currentUser();
  if (!user) return <SignInPrompt title={<>Your <em>profile</em></>} text="Sign in to see your profile and collection." />;
  const [liked, downloaded] = await Promise.all([
    store.likedIds(user.id).then(wallpapersByIds),
    store.downloadedIds(user.id).then(wallpapersByIds),
  ]);
  return <ProfileView user={publicUser(user)!} liked={liked} downloaded={downloaded} />;
}
