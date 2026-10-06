'use client';
// Everything shared across pages in the browser: who is signed in, what they've liked, the
// toast message, and the sign-in dialog. Liking and downloading go through here so every card
// showing the same wallpaper stays in step.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/client';
import type { PublicUser, PublicWallpaper } from '@/lib/types';
import AuthModal, { type AuthOptions } from './auth-modal';

interface AppState {
  user: PublicUser | null;
  setUser: (u: PublicUser | null) => void;
  likedIds: Set<number>;
  likeCount: (w: Pick<PublicWallpaper, 'id' | 'likes'>) => number;
  toast: (msg: string) => void;
  openAuth: (opts?: AuthOptions) => void;
  toggleLike: (id: number) => Promise<{ liked: boolean; likes: number } | null>;
  downloadWallpaper: (id: number) => Promise<void>;
  logout: () => Promise<void>;
}

const Ctx = createContext<AppState | null>(null);
export const useApp = () => {
  const v = useContext(Ctx);
  if (!v) throw new Error('useApp outside AppProvider');
  return v;
};

// coming back from "Continue with Google" (see app/api/auth/google/callback)
const GOOGLE_RESULT: Record<string, string> = {
  'google-failed': 'Signing in with Google didn’t work. Please try again.',
  'google-off': 'Google sign-in isn’t set up on this site yet.',
};

export function AppProvider({ initialUser, initialLikedIds, googleEnabled, children }: {
  initialUser: PublicUser | null; initialLikedIds: number[]; googleEnabled: boolean; children: ReactNode;
}) {
  const router = useRouter();
  const [user, setUserState] = useState(initialUser);
  // read by actions that run right after signing in, before React has re-rendered
  const userRef = useRef(initialUser);
  const setUser = useCallback((u: PublicUser | null) => { userRef.current = u; setUserState(u); }, []);
  const [likedIds, setLikedIds] = useState(() => new Set(initialLikedIds));
  // like counts changed in this visit, so cards update without reloading the page
  const [likeOverrides, setLikeOverrides] = useState<Record<number, number>>({});
  const [toastMsg, setToastMsg] = useState<{ text: string; key: number; out: boolean } | null>(null);
  const [auth, setAuth] = useState<AuthOptions | null>(null);
  const toastTimers = useRef<number[]>([]);

  // a fresh server render (navigation, router.refresh) brings the latest counts
  useEffect(() => { setLikeOverrides({}); }, [initialLikedIds]);

  const toast = useCallback((text: string) => {
    toastTimers.current.forEach(clearTimeout);
    const key = Date.now();
    setToastMsg({ text, key, out: false });
    toastTimers.current = [
      window.setTimeout(() => setToastMsg((t) => (t && t.key === key ? { ...t, out: true } : t)), 2400),
      window.setTimeout(() => setToastMsg((t) => (t && t.key === key ? null : t)), 2800),
    ];
  }, []);

  const openAuth = useCallback((opts: AuthOptions = {}) => setAuth(opts), []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const result = params.get('signin');
    if (!result) return;
    if (result === 'google' && initialUser) toast(`Welcome, ${initialUser.name.split(' ')[0]}`);
    else if (GOOGLE_RESULT[result]) toast(GOOGLE_RESULT[result]);
    params.delete('signin');
    history.replaceState(null, '', location.pathname + (params.size ? `?${params}` : ''));
  }, [initialUser, toast]);

  const refreshLikes = useCallback(async () => {
    try {
      const liked = await api<PublicWallpaper[]>('/me/likes');
      setLikedIds(new Set(liked.map((w) => w.id)));
    } catch { /* ignore */ }
  }, []);

  const toggleLike = useCallback(async (id: number) => {
    if (!userRef.current) { openAuth({ reason: 'Sign in to like wallpapers and keep them in one place.' }); return null; }
    try {
      const res = await api<{ liked: boolean; likes: number }>(`/wallpapers/${id}/like`, { method: 'POST' });
      setLikedIds((s) => { const n = new Set(s); if (res.liked) n.add(id); else n.delete(id); return n; });
      setLikeOverrides((o) => ({ ...o, [id]: res.likes }));
      toast(res.liked ? 'Added to your likes' : 'Removed from your likes');
      return res;
    } catch (err) {
      toast((err as Error).message);
      return null;
    }
  }, [openAuth, toast]);

  const downloadWallpaper = useCallback(async (id: number): Promise<void> => {
    if (!userRef.current) {
      openAuth({ reason: 'Sign in to download wallpapers.', then: () => { downloadWallpaper(id); } });
      return;
    }
    try {
      const { url, name } = await api<{ url: string; name: string }>(`/wallpapers/${id}/download`, { method: 'POST' });
      // fetch as a blob so the file is saved (with a readable name) instead of opened in a tab
      const blob = await (await fetch(url)).blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 10000);
      toast('Your download has started');
    } catch (err) {
      toast(err instanceof ApiError && err.status === 401 ? err.message : 'Download failed, please try again');
    }
  }, [openAuth, toast]);

  const logout = useCallback(async () => {
    await api('/auth/logout', { method: 'POST' });
    setUser(null);
    setLikedIds(new Set());
    router.push('/');
    router.refresh();
  }, [router, setUser]);

  const onSignedIn = useCallback(async (u: PublicUser, mode: 'signup' | 'login', then?: () => void) => {
    setUser(u);
    setAuth(null);
    await refreshLikes();
    toast(mode === 'signup' ? `Welcome, ${u.name.split(' ')[0]}` : `Welcome back, ${u.name.split(' ')[0]}`);
    router.refresh();
    then?.();
  }, [setUser, refreshLikes, toast, router]);

  const value = useMemo<AppState>(() => ({
    user, setUser, likedIds,
    likeCount: (w) => likeOverrides[w.id] ?? w.likes,
    toast, openAuth, toggleLike, downloadWallpaper, logout,
  }), [user, setUser, likedIds, likeOverrides, toast, openAuth, toggleLike, downloadWallpaper, logout]);

  return (
    <Ctx.Provider value={value}>
      {children}
      <div id="modalRoot">
        {auth && <AuthModal {...auth} google={googleEnabled} onClose={() => setAuth(null)} onSignedIn={onSignedIn} />}
      </div>
      <div id="toastRoot">
        {toastMsg && <div key={toastMsg.key} className={`toast${toastMsg.out ? ' out' : ''}`}>{toastMsg.text}</div>}
      </div>
    </Ctx.Provider>
  );
}
