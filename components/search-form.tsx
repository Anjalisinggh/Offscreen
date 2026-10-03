'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Arrow, Search } from './icons';

// the home page's pill search and the search page's big underlined one; both go to /search?q=
export default function SearchForm({ variant, initial = '', autoFocus }: { variant: 'hero' | 'big'; initial?: string; autoFocus?: boolean }) {
  const router = useRouter();
  const [q, setQ] = useState(initial);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => setQ(initial), [initial]);
  useEffect(() => { if (autoFocus) input.current?.focus(); }, [autoFocus]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(`/search?q=${encodeURIComponent(q.trim())}`);
  };

  return variant === 'hero' ? (
    <form className="hero-search" onSubmit={submit}>
      <input ref={input} type="text" placeholder="Search dark, retro, pink…" autoComplete="off" value={q} onChange={(e) => setQ(e.target.value)} />
      <button type="submit" aria-label="Search"><Arrow /></button>
    </form>
  ) : (
    <form className="search-big reveal" onSubmit={submit}>
      <input ref={input} className="field-underline" type="text" placeholder="What’s your mood today?" autoComplete="off" value={q} onChange={(e) => setQ(e.target.value)} />
      <button type="submit" aria-label="Search"><Search /></button>
    </form>
  );
}
