'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/client';
import type { PublicWallpaper } from '@/lib/types';
import { useApp } from './app-context';
import ProfileView from './profile-view';
import SignInPrompt from './sign-in-prompt';

export default function ProfileLoader() {
  const { user, ready, likedIds } = useApp();
  const [lists, setLists] = useState<{ liked: PublicWallpaper[]; downloaded: PublicWallpaper[] } | null>(null);

  useEffect(() => {
    if (!user) return;
    Promise.all([api<PublicWallpaper[]>('/me/likes'), api<PublicWallpaper[]>('/me/downloads')])
      .then(([liked, downloaded]) => setLists({ liked, downloaded }))
      .catch(() => setLists({ liked: [], downloaded: [] }));
  }, [user, likedIds]);

  if (!ready || (user && !lists)) return <div className="page-head" style={{ minHeight: '60vh' }} />;
  if (!user) return <SignInPrompt title={<>Your <em>profile</em></>} text="Sign in to see your profile and collection." />;
  return <ProfileView user={user} liked={lists!.liked} downloaded={lists!.downloaded} />;
}
