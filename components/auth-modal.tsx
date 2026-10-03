'use client';
// Sign up (name + email) or log in (email), then enter the 6-digit code that was emailed.
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { api, ApiError } from '@/lib/client';
import type { PublicUser } from '@/lib/types';
import Modal from './modal';
import { useApp } from './app-context';
import { Arrow } from './icons';

export interface AuthOptions {
  reason?: string;
  mode?: 'signup' | 'login';
  then?: () => void;
}

const DEFAULT_REASON = 'Sign in to like and download wallpapers. No password needed.';

export default function AuthModal({ reason, mode: startMode = 'signup', then, onClose, onSignedIn }: AuthOptions & {
  onClose: () => void;
  onSignedIn: (u: PublicUser, mode: 'signup' | 'login', then?: () => void) => void;
}) {
  const { toast } = useApp();
  const [mode, setMode] = useState(startMode);
  const [step, setStep] = useState<'details' | 'code'>('details');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [sentTo, setSentTo] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const codeRef = useRef<HTMLInputElement>(null);

  // focus the first empty field of whichever step is showing
  useEffect(() => {
    const t = setTimeout(() => {
      if (step === 'code') codeRef.current?.focus();
      else (mode === 'signup' ? nameRef : emailRef).current?.focus();
    }, 30);
    return () => clearTimeout(t);
  }, [mode, step]);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  const switchMode = (m: 'signup' | 'login') => { setMode(m); setError(''); };

  const requestCode = () =>
    api<{ email: string; resendAfter: number }>('/auth/request-code', { method: 'POST', body: JSON.stringify({ mode, email: email.trim(), name: name.trim() }) });

  const onDetails = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await requestCode();
      setSentTo(res.email);
      setStep('code');
      setError('');
      setResendIn(res.resendAfter || 30);
    } catch (err) {
      const msg = (err as Error).message;
      if (/already has an account/.test(msg)) setMode('login');
      else if (/Sign up first/.test(msg)) setMode('signup');
      setError(msg);
    } finally { setBusy(false); }
  };

  const verify = async (value: string) => {
    if (value.length !== 6) { setError('Enter all 6 digits'); return; }
    setBusy(true);
    try {
      const { user } = await api<{ user: PublicUser }>('/auth/verify-code', { method: 'POST', body: JSON.stringify({ email: sentTo, code: value }) });
      onSignedIn(user, mode, then);
    } catch (err) {
      setError((err as Error).message);
      codeRef.current?.select();
    } finally { setBusy(false); }
  };

  const resend = async () => {
    try {
      const res = await requestCode();
      setError('');
      toast('A new code is on its way');
      setResendIn(res.resendAfter || 30);
    } catch (err) {
      setError((err as Error).message);
      if (err instanceof ApiError && err.retryAfter) setResendIn(err.retryAfter);
    }
  };

  const changeEmail = () => { setStep('details'); setCode(''); setError(''); };

  const title = step === 'code' ? <>Check your <em>email</em></>
    : mode === 'signup' ? <>Join <em>Offscreen</em></> : <>Welcome <em>back</em></>;

  return (
    <Modal onClose={onClose}>
      <span className="eyebrow">Members</span>
      <h3>{title}</h3>
      <p className="sub">
        {step === 'code'
          ? <>We sent a 6-digit code to <b>{sentTo}</b>. It expires in 10 minutes.</>
          : reason || DEFAULT_REASON}
      </p>

      {step === 'details' ? (
        <div>
          <div className="auth-switch" role="tablist">
            <button type="button" role="tab" className={mode === 'signup' ? 'active' : ''} onClick={() => switchMode('signup')}>Sign up</button>
            <button type="button" role="tab" className={mode === 'login' ? 'active' : ''} onClick={() => switchMode('login')}>Log in</button>
          </div>
          <form onSubmit={onDetails} noValidate>
            <label className="auth-field" hidden={mode === 'login'}><span>Name</span>
              <input ref={nameRef} className="field" type="text" maxLength={60} autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} /></label>
            <label className="auth-field"><span>Email</span>
              <input ref={emailRef} className="field" type="email" maxLength={200} autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
            <p className="auth-error" role="alert">{error}</p>
            <div className="modal-actions"><button className="btn accent" type="submit" disabled={busy}>Send code <Arrow /></button></div>
          </form>
        </div>
      ) : (
        <form onSubmit={(e) => { e.preventDefault(); verify(code); }} noValidate>
          <label className="auth-field"><span>6-digit code</span>
            <input
              ref={codeRef} className="field code-input" type="text" inputMode="numeric" autoComplete="one-time-code"
              maxLength={6} placeholder="••••••" value={code}
              onChange={(e) => {
                // submit as soon as the 6th digit is typed or pasted
                const v = e.target.value.replace(/\D/g, '').slice(0, 6);
                setCode(v);
                if (v.length === 6) verify(v);
              }}
            /></label>
          <p className="auth-error" role="alert">{error}</p>
          <div className="modal-actions code-actions">
            <button className="btn small" type="button" onClick={changeEmail}>Change email</button>
            <button className="btn small" type="button" onClick={resend} disabled={resendIn > 0}>
              {resendIn > 0 ? `Resend in ${resendIn}s` : 'Resend code'}
            </button>
            <button className="btn accent" type="submit" disabled={busy}>Verify <Arrow /></button>
          </div>
        </form>
      )}
    </Modal>
  );
}
