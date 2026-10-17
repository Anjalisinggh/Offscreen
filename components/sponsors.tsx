'use client';
// Sponsor placements, in the places people look first:
//  - a "Backed by" line in the home page's hero, above the fold
//  - a sponsor card as the first tile of the gallery grids (home and Explore)
//  - a card under each wallpaper's Download button
//  - a small "Sponsored by" note floating in the corner of every page, which can be closed
// Each sponsor is labelled; while a slot is unbooked, the same spots invite brands to book it.
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, type CSSProperties } from 'react';
import { SPONSORS, SPONSOR_CONTACT, SPONSOR_SLOTS, type Sponsor } from '@/lib/sponsors';
import { Arrow, Close, Share } from './icons';
import { useApp } from './app-context';

const booked = SPONSORS.slice(0, SPONSOR_SLOTS);
const openSlots = SPONSOR_SLOTS - booked.length;
const linkProps = (s?: Sponsor) => ({ href: s ? s.url : SPONSOR_CONTACT, target: '_blank', rel: s ? 'sponsored noopener' : 'noopener' });

function Logo({ s, className = '' }: { s?: Sponsor; className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return s ? <img className={`sp-logo ${className}`} src={s.logo} alt="" loading="lazy" />
    : <span className={`sp-logo sp-logo-empty ${className}`} aria-hidden="true">?</span>;
}

// a slim, horizontal card: logo, name and one line, and where it goes
function Slim({ s, slot, i = 0 }: { s?: Sponsor; slot: number; i?: number }) {
  return (
    <a className={`sp-slim reveal${s ? '' : ' sp-open'}`} style={{ '--i': i } as CSSProperties} {...linkProps(s)}
      aria-label={s ? `Sponsored: ${s.name}` : 'Sponsor slot open: message us on X to book it'}>
      <Logo s={s} />
      <span className="sp-slim-body">
        <span className="sp-slim-tag">{s ? 'Sponsored' : `Slot ${String(slot + 1).padStart(2, '0')} · Open`}</span>
        <b>{s ? s.name : <>Your brand, <em>here</em></>}</b>
        <span className="sp-slim-line">{s ? s.tagline : 'Seen by people who care about what’s on their screen.'}</span>
      </span>
      <span className="sp-slim-go" aria-hidden="true"><Arrow /></span>
    </a>
  );
}

// every slot side by side, booked or open (the sponsor page shows these)
export default function Sponsors() {
  return (
    <div className="sp-row">
      {Array.from({ length: SPONSOR_SLOTS }, (_, k) => <Slim key={k} s={booked[k]} slot={k} i={k} />)}
    </div>
  );
}

// the "Backed by" line in the home page's hero: every sponsor's logo, or an invite while there's none
export function SponsorBacked() {
  return (
    <div className="hero-backed">
      <span className="hero-backed-label">Backed by</span>
      {booked.length
        ? booked.map((s, k) => (
          <a key={k} className="hero-backed-item" {...linkProps(s)} title={`Sponsored: ${s.name}`}><Logo s={s} />{s.name}</a>
        ))
        : <Link className="hero-backed-item sp-open" href="/sponsor"><Logo />Your brand, <em>here</em><Arrow /></Link>}
    </div>
  );
}

// the first tile of a gallery grid: the sponsors take turns by visit; while no slot is booked, an
// open card inviting brands in
export function SponsorTile() {
  const { toast } = useApp();
  const [n, setN] = useState(0);
  useEffect(() => { if (booked.length > 1) setN(Math.floor(Math.random() * booked.length)); }, []);
  const s = booked[n];

  const copy = async () => {
    const url = s ? s.url : `${location.origin}/sponsor`;
    try { await navigator.clipboard.writeText(url); toast('Link copied'); } catch { toast(url); }
  };

  return (
    <div className={`sp-feat reveal${s ? '' : ' sp-open'}`}>
      <div className="sp-feat-box">
        <span className="sp-feat-label">{s ? 'Sponsored' : 'Sponsor'}</span>
        <div className="sp-feat-id">
          <Logo s={s} />
          <div>
            <b>{s ? s.name : 'Your brand here'}</b>
            <span className="sp-feat-status">{s ? s.tagline : <><i />{openSlots} of {SPONSOR_SLOTS} slots open</>}</span>
          </div>
        </div>
        <div className="sp-feat-actions">
          <a className="sp-feat-btn primary" {...linkProps(s)}>{s ? 'Visit site' : 'DM to book'} <Arrow /></a>
          <button className="sp-feat-btn" onClick={copy} aria-label="Copy link"><Share /> Copy link</button>
        </div>
      </div>
      <Link className="sp-feat-become" href="/sponsor">Become a sponsor</Link>
    </div>
  );
}

// one card beside a wallpaper's Download button: the sponsors take turns by wallpaper, so each is seen
export function SponsorAside({ seed }: { seed: number }) {
  const s = booked.length ? booked[seed % booked.length] : undefined;
  return (
    <div className="sp-aside reveal">
      <Slim s={s} slot={0} />
      {!s && <Link className="sp-aside-more" href="/sponsor">Sponsor Offscreen</Link>}
    </div>
  );
}

// "Sponsored by …" in the corner of every page: a small deck of cards, one per sponsor slot (booked
// ones first, then open ones), stacked so only the front card shows in full. Every few seconds the
// front card goes to the back and the next one comes up; pointing at the deck holds it still. It comes
// in a moment after the page does, and once closed it stays away for the rest of the visit
const DISMISS_KEY = 'offscreen_sponsor_note';
const DECK_EVERY = 4500;
const deck: (Sponsor | undefined)[] = Array.from({ length: SPONSOR_SLOTS }, (_, k) => booked[k]);

export function SponsorFloat() {
  const path = usePathname();
  const [shown, setShown] = useState(false);
  const [front, setFront] = useState(0);
  const [held, setHeld] = useState(false);

  useEffect(() => {
    let closed = false;
    try { closed = sessionStorage.getItem(DISMISS_KEY) === '1'; } catch { /* storage unavailable */ }
    if (closed) return;
    // the booked sponsors take turns being first
    if (booked.length > 1) setFront(Math.floor(Math.random() * booked.length));
    const t = setTimeout(() => setShown(true), 2500);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!shown || held || deck.length < 2) return;
    const t = setInterval(() => setFront((f) => (f + 1) % deck.length), DECK_EVERY);
    return () => clearInterval(t);
  }, [shown, held]);

  if (path === '/sponsor') return null;
  const close = () => {
    setShown(false);
    try { sessionStorage.setItem(DISMISS_KEY, '1'); } catch { /* storage unavailable */ }
  };

  return (
    <div className={`sp-float${shown ? ' shown' : ''}`} aria-hidden={!shown} role="region" aria-label="Sponsors"
      onMouseEnter={() => setHeld(true)} onMouseLeave={() => setHeld(false)} onFocus={() => setHeld(true)} onBlur={() => setHeld(false)}>
      {deck.map((s, k) => {
        // how far back in the deck this card is: 0 is the front
        const d = (k - front + deck.length) % deck.length;
        const live = shown && d === 0;
        const inner = (
          <>
            <Logo s={s} />
            <span className="sp-deck-text">
              <span>{s ? 'Sponsored by' : `Sponsor slot ${String(k + 1).padStart(2, '0')} · open`}</span>
              <b>{s ? s.name : 'Your brand here'}</b>
            </span>
          </>
        );
        return (
          <div key={k} className={`sp-deck-card${s ? '' : ' sp-open'}${d === deck.length - 1 && deck.length > 1 ? ' to-back' : ''}`}
            style={{ '--d': Math.min(d, 3) } as CSSProperties} aria-hidden={!live}>
            {s
              ? <a {...linkProps(s)} tabIndex={live ? 0 : -1}>{inner}</a>
              : <Link href="/sponsor" tabIndex={live ? 0 : -1}>{inner}</Link>}
          </div>
        );
      })}
      {deck.length > 1 && (
        <span className="sp-deck-count" aria-hidden="true">{front + 1}/{deck.length}</span>
      )}
      <button className="sp-deck-close" onClick={close} aria-label="Close" tabIndex={shown ? 0 : -1}><Close /></button>
    </div>
  );
}
