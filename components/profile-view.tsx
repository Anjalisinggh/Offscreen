'use client';
import { useRouter } from 'next/navigation';
import { useLayoutEffect, useRef, useState } from 'react';
import { api, friendlyError } from '@/lib/client';
import type { PublicUser, PublicWallpaper } from '@/lib/types';
import { useApp } from './app-context';
import Avatar from './avatar';
import Grid from './grid';
import { Camera } from './icons';

// resized in the browser first, so a phone photo of several MB uploads as a small JPEG
function shrinkImage(file: File, max: number) {
  return new Promise<Blob>((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * scale);
      c.height = Math.round(img.height * scale);
      c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(img.src);
      c.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not read that image'))), 'image/jpeg', 0.9);
    };
    img.onerror = () => reject(new Error('Could not read that image'));
    img.src = URL.createObjectURL(file);
  });
}

export default function ProfileView({ user: initialUser, liked, downloaded }: {
  user: PublicUser; liked: PublicWallpaper[]; downloaded: PublicWallpaper[];
}) {
  const router = useRouter();
  const { user: ctxUser, setUser, toast, logout } = useApp();
  const u = ctxUser ?? initialUser;
  const [tab, setTab] = useState<'liked' | 'downloads'>('liked');
  const fileInput = useRef<HTMLInputElement>(null);
  const tabs = useRef<HTMLDivElement>(null);
  const [bar, setBar] = useState({ width: 0, x: 0 });
  const since = u.createdAt ? new Date(u.createdAt).toLocaleDateString(undefined, { month: 'long', year: 'numeric' }) : 'recently';

  useLayoutEffect(() => {
    const active = tabs.current?.querySelector<HTMLButtonElement>('button.active');
    if (active) setBar({ width: active.offsetWidth, x: active.offsetLeft });
  }, [tab]);

  const updated = (next: PublicUser, msg: string) => { setUser(next); toast(msg); router.refresh(); };

  const onFile = async () => {
    const file = fileInput.current?.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast('Please choose an image'); return; }
    try {
      toast('Uploading your photo…');
      const blob = await shrinkImage(file, 512);
      const res = await fetch('/api/me/avatar', { method: 'PUT', headers: { 'Content-Type': blob.type }, body: blob });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || friendlyError(res.status));
      updated(data.user, 'Profile photo updated');
    } catch (err) { toast((err as Error).message); }
    finally { if (fileInput.current) fileInput.current.value = ''; }
  };
  const removePhoto = async () => {
    try {
      const { user } = await api<{ user: PublicUser }>('/me/avatar', { method: 'DELETE' });
      updated(user, 'Profile photo removed');
    } catch (err) { toast((err as Error).message); }
  };

  const [items, empty] = tab === 'liked'
    ? [liked, <div key="l" className="empty-state"><h3>An empty <em>gallery</em></h3>Your liked wallpapers will appear here.</div>]
    : [downloaded, <div key="d" className="empty-state"><h3>No <em>downloads</em> yet</h3>Wallpapers you download will appear here.</div>];

  return (
    <>
      <div className="profile-head reveal">
        <div className="avatar-edit">
          <button type="button" className="avatar-btn" aria-label="Change profile photo" onClick={() => fileInput.current?.click()}>
            <Avatar user={u} className="profile-avatar-lg" />
            <span className="avatar-overlay"><Camera /><small>{u.avatar ? 'Change' : 'Add photo'}</small></span>
          </button>
          <input ref={fileInput} type="file" accept="image/*" hidden onChange={onFile} />
          {u.avatar && <button type="button" className="avatar-remove" onClick={removePhoto}>Remove photo</button>}
        </div>
        <div>
          <span className="eyebrow">Member since {since}</span>
          <h1>{u.name}</h1>
          <p>{u.email} · {liked.length} liked · {downloaded.length} downloaded</p>
        </div>
        <button className="btn" onClick={logout}>Sign out</button>
      </div>
      <div className="tabs" ref={tabs}>
        <button className={tab === 'liked' ? 'active' : ''} onClick={() => setTab('liked')}>Liked<sup>{liked.length}</sup></button>
        <button className={tab === 'downloads' ? 'active' : ''} onClick={() => setTab('downloads')}>Downloads<sup>{downloaded.length}</sup></button>
        <span className="tabs-bar" style={{ width: bar.width, transform: `translateX(${bar.x}px)` }}></span>
      </div>
      <Grid key={tab} items={items} empty={empty} />
    </>
  );
}
