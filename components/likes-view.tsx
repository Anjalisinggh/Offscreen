'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api } from '@/lib/client';
import type { PublicWallpaper } from '@/lib/types';
import { useApp } from './app-context';
import Grid from './grid';
import SignInPrompt from './sign-in-prompt';
import { Arrow } from './icons';

export default function LikesView() {
  const { user, ready, likedIds } = useApp();
  const [items, setItems] = useState<PublicWallpaper[] | null>(null);

  // reloaded when a like is added or removed, so the list stays in step
  useEffect(() => {
    if (!user) return;
    api<PublicWallpaper[]>('/me/likes').then(setItems).catch(() => setItems([]));
  }, [user, likedIds]);

  if (!ready || (user && !items)) return <div className="page-head" style={{ minHeight: '60vh' }} />;
  if (!user) return <SignInPrompt title={<>Your <em>likes</em> live here</>} text="Sign in to keep the wallpapers you love in one place." />;
  return (
    <>
      <div className="page-head">
        <span className="eyebrow reveal">{items!.length} saved</span>
        <h1><span className="line-mask"><span>My <em>likes</em></span></span></h1>
      </div>
      <Grid items={items!} empty={
        <div className="empty-state"><h3>Nothing <em>liked</em> yet</h3>Tap the heart on any wallpaper to keep it here.<br /><Link className="btn" href="/explore">Start exploring <Arrow /></Link></div>
      } />
    </>
  );
}
