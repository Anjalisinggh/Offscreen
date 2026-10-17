// For brands: what sponsoring Offscreen means, where a sponsor shows up and how to book it. Every
// number is read from the library and the live counts, never typed in; slots and contact are in lib/sponsors.ts.
// The placement previews are small drawings of the real pages, made from real wallpapers.
import Link from 'next/link';
import type { CSSProperties, ReactNode } from 'react';
import { dedupeSeries, loadWallpapers, memberCount, publicWallpaper } from '@/lib/wallpapers';
import { isDesktop } from '@/lib/client';
import { AUDIENCE, SPONSORS, SPONSOR_CONTACT, SPONSOR_HANDLE, SPONSOR_SLOTS } from '@/lib/sponsors';
import Sponsors from '@/components/sponsors';
import CountUp from '@/components/count-up';
import LightWave from '@/components/light-wave';
import { Arrow, XLogo } from '@/components/icons';

export const metadata = {
  title: 'Sponsor Offscreen · Put your brand next to the wallpapers people keep',
  description: 'Sponsor Offscreen, a free wallpaper gallery for phone and desktop. A few labelled slots, no pop-ups, no trackers. Message us to book one.',
  alternates: { canonical: '/sponsor' },
};

/* eslint-disable @next/next/no-img-element */
// the four placements, each drawn as a tiny version of its page with the sponsor's spot lit up
function Placement({ n, title, children, art }: { n: string; title: ReactNode; children: ReactNode; art: ReactNode }) {
  return (
    <article className="spp-place reveal" style={{ '--i': +n - 1 } as CSSProperties}>
      <div className="spp-mini" aria-hidden="true">{art}</div>
      <div className="spp-place-copy">
        <i>{n}</i>
        <h3>{title}</h3>
        <p>{children}</p>
      </div>
    </article>
  );
}

export default async function Sponsor() {
  const every = (await loadWallpapers()).map(publicWallpaper);
  const all = dedupeSeries(every);
  const downloads = every.reduce((s, w) => s + w.downloads, 0);
  const likes = every.reduce((s, w) => s + w.likes, 0);
  const members = await memberCount();
  const open = SPONSOR_SLOTS - Math.min(SPONSORS.length, SPONSOR_SLOTS);
  const phones = all.filter((w) => !isDesktop(w)).sort((a, b) => b.downloads - a.downloads);
  const t = phones.slice(0, 11).map((w) => w.thumb);
  const thumb = (k: number) => t[k % Math.max(t.length, 1)];

  return (
    <div className="spp">
      {/* 1 · the pitch, centred over a glowing wave */}
      <section className="spp-hero">
        {/* a glowing wave of fine lines drifting behind the pitch */}
        <LightWave className="spp-wave" />
        <span className="spp-trust reveal">Seen by {(Math.floor(AUDIENCE.visitors / 1000) * 1000).toLocaleString('en')}+ visitors in launch week</span>
        <h1>
          <span className="line-mask"><span>Wallpapers people keep.</span></span>
          <span className="line-mask" style={{ '--i': 1 } as CSSProperties}><span>Brands people <em>see.</em></span></span>
        </h1>
        <p className="reveal">Offscreen is a free, hand-picked wallpaper gallery for phone and desktop. A few sponsors help keep it free, and get seen by people who care about what’s on their screen.</p>
        <div className="spp-cta reveal">
          <a className="btn accent" href={SPONSOR_CONTACT} target="_blank" rel="noopener"><XLogo /> DM {SPONSOR_HANDLE} <Arrow /></a>
          <a className="btn spp-btn-soft" href="#placements"><b className="sp-logo sp-logo-empty" aria-hidden="true">?</b> See the placements <Arrow /></a>
        </div>

      </section>

      {/* 2 · the numbers: visitors (from analytics, lib/sponsors.ts), the rest live */}
      <section className="spp-stats reveal">
        <div><strong><CountUp value={AUDIENCE.visitors} /><b>+</b></strong><small>Visitors</small></div>
        <div><strong><CountUp value={AUDIENCE.pageViews} /><b>+</b></strong><small>Page views</small></div>
        <div><strong><CountUp value={downloads} /></strong><small>Downloads</small></div>
        {members !== null
          ? <div><strong><CountUp value={members} exact /></strong><small>Members</small></div>
          : <div><strong><CountUp value={all.length} /></strong><small>Wallpapers</small></div>}
      </section>

      {/* 3 · the four placements */}
      <section className="spp-section" id="placements">
        <div className="spp-head reveal">
          <span className="eyebrow">Placements</span>
          <h2>Four places you’ll be <em>seen</em></h2>
          <p>One slot puts you in all four, always marked <b>Sponsored</b> and linking straight to you.</p>
        </div>
        <div className="spp-places">
          <Placement n="01" title={<>“Backed by”, <em>top of the home page</em></>}
            art={<div className="mini-hero">
              <div className="mini-copy"><span className="mini-hl mini-pill" /><span className="mini-bar w60" /><span className="mini-bar big w80" /><span className="mini-bar big w50" /><span className="mini-bar w70" /></div>
              <div className="mini-wall">{[0, 1, 2, 3, 4, 5].map((k) => <img key={k} src={thumb(k)} alt="" />)}</div>
            </div>}>
            Your name and logo in the top banner, the first thing anyone sees when they arrive.
          </Placement>
          <Placement n="02" title={<>First card <em>in the gallery</em></>}
            art={<div className="mini-grid">
              <span className="mini-hl mini-tile"><span className="mini-dot" /><span className="mini-bar w70" /><span className="mini-bar w50" /><span className="mini-btn" /></span>
              {[2, 3, 4, 5, 6, 7, 8].map((k) => <img key={k} src={thumb(k)} alt="" />)}
            </div>}>
            The top-left card of the gallery, on the home page and on Explore, right where the eye lands.
          </Placement>
          <Placement n="03" title={<>Under every <em>Download</em> button</>}
            art={<div className="mini-detail">
              <div className="mini-phone"><img src={thumb(3)} alt="" /></div>
              <div className="mini-info"><span className="mini-bar w50" /><span className="mini-bar big w80" /><span className="mini-dl" /><span className="mini-hl mini-card" /><span className="mini-bar w60" /></div>
            </div>}>
            On every wallpaper’s page, at the moment someone decides to keep one.
          </Placement>
          <Placement n="04" title={<>A card in <em>the corner</em></>}
            art={<div className="mini-corner">
              <div className="mini-grid faint">{[4, 5, 6, 7, 8, 9, 10, 0].map((k) => <img key={k} src={thumb(k)} alt="" />)}</div>
              <div className="mini-deck"><span /><span /><span className="mini-hl" /></div>
            </div>}>
            A small “Sponsored by” card in the corner of every page, taking turns with the other sponsors.
          </Placement>
        </div>
      </section>

      {/* 4 · what a slot includes, and what we need from you */}
      <section className="spp-section spp-offer">
        <div className="spp-plan reveal">
          <span className="eyebrow">One sponsor slot</span>
          <h3>Everything, <em>in one slot</em></h3>
          <ul>
            <li>“Backed by” in the home page’s top banner</li>
            <li>The first card in the gallery, on Home and Explore</li>
            <li>A card under every wallpaper’s Download button</li>
            <li>The “Sponsored by” card in the corner of every page</li>
            <li>A direct link to your site from all of them</li>
          </ul>
          <div className="spp-plan-foot">
            <p><b>Early-sponsor rate.</b> Dates and price are agreed over DM, and only {SPONSOR_SLOTS} sponsors run at a time.</p>
            <a className="btn accent" href={SPONSOR_CONTACT} target="_blank" rel="noopener">Book a slot <Arrow /></a>
          </div>
        </div>

        <div className="spp-side">
          <div className="spp-send reveal" style={{ '--i': 1 } as CSSProperties}>
            <h4>What you send</h4>
            <ol>
              <li><b>A square logo</b><span>At least 256 × 256</span></li>
              <li><b>Your name and one line</b><span>About what you make, around 90 characters</span></li>
              <li><b>A link</b><span>Where you want people to land</span></li>
            </ol>
          </div>
          <div className="spp-steps reveal" style={{ '--i': 2 } as CSSProperties}>
            <h4>How it works</h4>
            <ol>
              <li><b>DM {SPONSOR_HANDLE}</b><span>Tell us what you make</span></li>
              <li><b>Agree dates and price</b><span>Then send your logo, line and link</span></li>
              <li><b>Go live</b><span>As soon as everything’s in</span></li>
            </ol>
          </div>
        </div>
      </section>

      {/* 5 · the ground rules */}
      <section className="spp-section">
        <div className="spp-head reveal">
          <span className="eyebrow">The ground rules</span>
          <h2>Good for you, <em>good for them</em></h2>
        </div>
        <div className="spp-rules">
          <div className="reveal"><b>Few slots</b><p>At most {SPONSOR_SLOTS} sponsors at a time, so each one gets seen.</p></div>
          <div className="reveal" style={{ '--i': 1 } as CSSProperties}><b>Always labelled</b><p>Every sponsor card says “Sponsored”, so visitors trust it.</p></div>
          <div className="reveal" style={{ '--i': 2 } as CSSProperties}><b>No pop-ups, no trackers</b><p>Just cards and links. Nothing gets in the way of the wallpapers.</p></div>
          <div className="reveal" style={{ '--i': 3 } as CSSProperties}><b>A good fit</b><p>Apps, tools, creators and brands our visitors would actually like.</p></div>
        </div>
      </section>

      {/* 6 · the slots as they stand, and one last way in */}
      <section className="spp-final">
        <span className="spp-status reveal"><i />{open > 0 ? `${open} of ${SPONSOR_SLOTS} slots open` : 'All slots booked'}</span>
        <h2 className="reveal">This wall is <em>available.</em></h2>
        <Sponsors />
        <a className="btn accent reveal" href={SPONSOR_CONTACT} target="_blank" rel="noopener"><XLogo /> DM {SPONSOR_HANDLE} to book</a>
        <Link className="spp-back reveal" href="/">Back to the wallpapers</Link>
      </section>
    </div>
  );
}
