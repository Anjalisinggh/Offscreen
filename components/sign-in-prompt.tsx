'use client';
import type { ReactNode } from 'react';
import { useApp } from './app-context';
import { Arrow } from './icons';

export default function SignInPrompt({ title, text }: { title: ReactNode; text: string }) {
  const { openAuth } = useApp();
  return (
    <div className="empty-state" style={{ paddingTop: 140 }}>
      <span className="eyebrow">Members</span>
      <h3 style={{ marginTop: 18 }}>{title}</h3>
      {text}<br />
      <button className="btn accent" onClick={() => openAuth()}>Sign in <Arrow /></button>
    </div>
  );
}
