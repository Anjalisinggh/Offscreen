'use client';
// Sign up: name + email + password, then the 6-digit code emailed once to prove the address.
// Log in: email + password, no code. Forgot password: a code is emailed, entered with a new password.
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
type Step = 'signup' | 'login' | 'forgot' | 'code';

const DEFAULT_REASON = 'Sign in to like and download wallpapers.';

export default function AuthModal({ reason, mode = 'signup', then, onClose, onSignedIn }: AuthOptions & {
  onClose: () => void;
  onSignedIn: (u: PublicUser, mode: 'signup' | 'login', then?: () => void) => void;
}) {
  const { toast } = useApp();
  const [step, setStep] = useState<Step>(mode);
  const [codeFor, setCodeFor] = useState<'signup' | 'reset'>('signup'); // what the code step finishes
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [sentTo, setSentTo] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const first = useRef<HTMLInputElement>(null);

  // focus the first field of whichever step is showing
  useEffect(() => {
    const t = setTimeout(() => first.current?.focus(), 30);
    return () => clearTimeout(t);
  }, [step]);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  const go = (s: Step, msg = '') => { setStep(s); setError(''); setNote(msg); };

  const requestCode = (purpose: 'signup' | 'reset') =>
    api<{ email: string; resendAfter: number }>('/auth/request-code', {
      method: 'POST',
      body: JSON.stringify(purpose === 'signup'
        ? { mode: 'signup', name: name.trim(), email: email.trim(), password }
        : { mode: 'reset', email: email.trim() }),
    });

  const sendCode = async (purpose: 'signup' | 'reset') => {
    setBusy(true);
    try {
      const res = await requestCode(purpose);
      setCodeFor(purpose);
      setSentTo(res.email);
      setCode('');
      go('code');
      setResendIn(res.resendAfter || 30);
    } catch (err) {
      const msg = (err as Error).message;
      if (/already has an account/.test(msg)) go('login');
      else if (/Sign up first/.test(msg)) go('signup');
      setError(msg);
    } finally { setBusy(false); }
  };

  const logIn = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { user } = await api<{ user: PublicUser }>('/auth/login', { method: 'POST', body: JSON.stringify({ email: email.trim(), password }) });
      onSignedIn(user, 'login', then);
    } catch (err) {
      const msg = (err as Error).message;
      if (/doesn’t have a password yet/.test(msg)) go('forgot', msg);
      else if (/Sign up first/.test(msg)) { go('signup'); setError(msg); }
      else setError(msg);
    } finally { setBusy(false); }
  };

  const verify = async (value: string) => {
    if (value.length !== 6) { setError('Enter all 6 digits'); return; }
    if (codeFor === 'reset' && newPassword.length < 8) { setError('Please choose a password of at least 8 characters'); return; }
    setBusy(true);
    try {
      const { user } = await api<{ user: PublicUser }>('/auth/verify-code', {
        method: 'POST',
        body: JSON.stringify({ email: sentTo, code: value, ...(codeFor === 'reset' ? { password: newPassword } : {}) }),
      });
      if (codeFor === 'reset') toast('Your new password is set');
      onSignedIn(user, codeFor === 'signup' ? 'signup' : 'login', then);
    } catch (err) {
      setError((err as Error).message);
    } finally { setBusy(false); }
  };

  const resend = async () => {
    try {
      const res = await requestCode(codeFor);
      setError('');
      toast('A new code is on its way');
      setResendIn(res.resendAfter || 30);
    } catch (err) {
      setError((err as Error).message);
      if (err instanceof ApiError && err.retryAfter) setResendIn(err.retryAfter);
    }
  };

  const title = step === 'code' ? <>Check your <em>email</em></>
    : step === 'forgot' ? <>Reset your <em>password</em></>
    : step === 'signup' ? <>Join <em>Offscreen</em></> : <>Welcome <em>back</em></>;
  const sub = step === 'code' ? <>We sent a 6-digit code to <b>{sentTo}</b>. It expires in 10 minutes.</>
    : step === 'forgot' ? (note || 'Enter your email and we’ll send you a code to set a new password.')
    : reason || DEFAULT_REASON;

  const field = (label: string, input: React.ReactNode) => <label className="auth-field"><span>{label}</span>{input}</label>;
  const actions = (label: string) => (
    <>
      <p className="auth-error" role="alert">{error}</p>
      <div className="modal-actions"><button className="btn accent" type="submit" disabled={busy}>{label} <Arrow /></button></div>
    </>
  );

  return (
    <Modal onClose={onClose}>
      <span className="eyebrow">Members</span>
      <h3>{title}</h3>
      <p className="sub">{sub}</p>

      {(step === 'signup' || step === 'login') && (
        <div className="auth-switch" role="tablist">
          <button type="button" role="tab" className={step === 'signup' ? 'active' : ''} onClick={() => go('signup')}>Sign up</button>
          <button type="button" role="tab" className={step === 'login' ? 'active' : ''} onClick={() => go('login')}>Log in</button>
        </div>
      )}

      {step === 'signup' && (
        <form onSubmit={(e) => { e.preventDefault(); sendCode('signup'); }} noValidate>
          {field('Name', <input ref={first} className="field" type="text" maxLength={60} autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />)}
          {field('Email', <input className="field" type="email" maxLength={200} autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />)}
          {field('Password', <input className="field" type="password" minLength={8} maxLength={200} autoComplete="new-password" placeholder="At least 8 characters" value={password} onChange={(e) => setPassword(e.target.value)} />)}
          {actions('Send code')}
        </form>
      )}

      {step === 'login' && (
        <form onSubmit={logIn} noValidate>
          {field('Email', <input ref={first} className="field" type="email" maxLength={200} autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />)}
          {field('Password', <input className="field" type="password" maxLength={200} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />)}
          <button type="button" className="auth-link" onClick={() => go('forgot')}>Forgot password?</button>
          {actions('Log in')}
        </form>
      )}

      {step === 'forgot' && (
        <form onSubmit={(e) => { e.preventDefault(); sendCode('reset'); }} noValidate>
          {field('Email', <input ref={first} className="field" type="email" maxLength={200} autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />)}
          <button type="button" className="auth-link" onClick={() => go('login')}>Back to log in</button>
          {actions('Send code')}
        </form>
      )}

      {step === 'code' && (
        <form onSubmit={(e) => { e.preventDefault(); verify(code); }} noValidate>
          {field('6-digit code', <input
            ref={first} className="field code-input" type="text" inputMode="numeric" autoComplete="one-time-code"
            maxLength={6} placeholder="••••••" value={code}
            onChange={(e) => {
              const v = e.target.value.replace(/\D/g, '').slice(0, 6);
              setCode(v);
              // a sign-up finishes as soon as the 6th digit is typed or pasted
              if (v.length === 6 && codeFor === 'signup') verify(v);
            }}
          />)}
          {codeFor === 'reset' && field('New password', <input className="field" type="password" minLength={8} maxLength={200} autoComplete="new-password" placeholder="At least 8 characters" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />)}
          <p className="auth-error" role="alert">{error}</p>
          <div className="modal-actions code-actions">
            <button className="btn small" type="button" onClick={() => go(codeFor === 'signup' ? 'signup' : 'forgot')}>Change email</button>
            <button className="btn small" type="button" onClick={resend} disabled={resendIn > 0}>
              {resendIn > 0 ? `Resend in ${resendIn}s` : 'Resend code'}
            </button>
            <button className="btn accent" type="submit" disabled={busy}>{codeFor === 'reset' ? 'Set password' : 'Verify'} <Arrow /></button>
          </div>
        </form>
      )}
    </Modal>
  );
}
