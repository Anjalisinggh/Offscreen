// The contact page: how to reach the people behind Offscreen. Messages on X are the main route
// for now; set EMAIL to an inbox address to add email as the first option.
import Link from 'next/link';

export const metadata = {
  title: 'Contact · Offscreen',
  description: 'How to reach Offscreen: questions, wallpaper requests, credit or removal of a wallpaper, and data requests.',
  alternates: { canonical: '/contact' },
};

const EMAIL: string | null = null;
const X_URL = 'https://x.com/anjalisinggh12';
const X_HANDLE = '@anjalisinggh12';
const INSTAGRAM_URL = 'https://instagram.com/anjalisinggh.12';
const INSTAGRAM_HANDLE = '@anjalisinggh.12';

export default function Contact() {
  return (
    <>
      <div className="page-head page-head-wide">
        <span className="eyebrow reveal">Get in touch</span>
        <h1><span className="line-mask"><span><em>Contact</em> us</span></span></h1>
        <p className="reveal">Offscreen is run by a small team. Questions, ideas and problems all reach the same people, and we read every message.</p>
      </div>

      <article className="legal">
        <h2>How to reach us</h2>
        <ul>
          {EMAIL && <li><b>Email</b>: <a href={`mailto:${EMAIL}`}>{EMAIL}</a></li>}
          <li><b>X (Twitter)</b>: send a direct message to <a href={X_URL} target="_blank" rel="noopener">{X_HANDLE}</a>. This is the fastest way to reach us.</li>
          <li><b>Instagram</b>: message <a href={INSTAGRAM_URL} target="_blank" rel="noopener">{INSTAGRAM_HANDLE}</a>.</li>
        </ul>
        <p>We usually reply within two working days.</p>

        <h2>What to write to us about</h2>
        <ul>
          <li><b>Wallpaper requests</b>: a mood, a colour or a phone you’d like us to make wallpapers for.</li>
          <li><b>Something broken</b>: a download that fails, a page that looks wrong, or trouble signing in. Tell us the page and your device.</li>
          <li><b>Credit or removal</b>: if you believe a wallpaper uses your work, send us its link and we’ll credit it or take it down.</li>
          <li><b>Your account and data</b>: to see, correct or delete what we hold about you, see the <Link href="/privacy">privacy policy</Link>. We reply to these within 30 days.</li>
          <li><b>Advertising and partnerships</b>: brands and creators who want to work with Offscreen. To sponsor the site, see <Link href="/sponsor">sponsoring Offscreen</Link>.</li>
        </ul>
        <p>Please don’t post your email address or other personal details publicly. If we need to confirm your account, we’ll do it in private messages.</p>

        <p className="legal-back"><Link className="link-arrow" href="/">Back to the gallery</Link></p>
      </article>
    </>
  );
}
