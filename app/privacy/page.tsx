// The privacy policy: what the site stores, the outside services it uses (including Google's
// advertising), and how to get your data removed. Keep it in step with the code when any of
// that changes, and move UPDATED forward when it does.
import Link from 'next/link';

export const metadata = {
  title: 'Privacy policy · Offscreen',
  description: 'What Offscreen stores about you, the services it uses, including Google advertising, and how to have your data removed.',
  alternates: { canonical: '/privacy' },
};

// where to reach us: the project's GitHub page for now (a contact email can replace it later)
const CONTACT = 'https://github.com/Anjalisinggh/Offscreen/issues';
const UPDATED = '15 October 2026';

export default function Privacy() {
  return (
    <>
      <div className="page-head">
        <span className="eyebrow reveal">Last updated {UPDATED}</span>
        <h1><span className="line-mask"><span>Privacy <em>policy</em></span></span></h1>
        <p className="reveal">Offscreen (offscreen.wtf) is a wallpaper gallery. This page explains what we store about you, which outside services see your visit, and what you can do about it.</p>
      </div>

      <article className="legal">
        <h2>Browsing without an account</h2>
        <p>You can look at, preview and search every wallpaper without signing in. We don’t ask for your name or email to browse.</p>
        <p>Like most websites, our hosting provider receives your IP address and browser details with each request, which it uses to deliver pages and protect the site from abuse.</p>

        <h2>If you create an account</h2>
        <p>Signing in lets you like and download wallpapers and keep them in your profile. For that we store:</p>
        <ul>
          <li>your <b>name</b> and <b>email address</b>;</li>
          <li>your <b>password</b>, if you set one, kept only as a one-way scrambled hash that can’t be turned back into the password;</li>
          <li>a <b>profile photo</b>, only if you upload one (you can remove it any time from your profile);</li>
          <li>the wallpapers you <b>like</b> and <b>download</b>, and when.</li>
        </ul>
        <p>If you choose <b>Continue with Google</b>, Google tells us your name and email address; we don’t receive your Google password or anything else from your Google account.</p>
        <p>When you ask for a sign-in code, we email it to you and keep a scrambled copy for a few minutes until it’s used or expires. To stop the code form being misused, we also keep a scrambled (hashed) form of the IP address that asked, for a short time.</p>
        <p>We never sell your information, and we don’t use your email for newsletters or marketing.</p>

        <h2>Cookies and storage on your device</h2>
        <ul>
          <li><b>Sign-in cookie</b> (<code>sid</code>): keeps you signed in for up to 90 days. It’s only set when you sign in, and signing out removes it.</li>
          <li><b>Theme</b>: whether you picked light or dark mode is remembered in your browser’s local storage. It never leaves your device.</li>
          <li><b>Analytics and advertising cookies</b> set by Google, described below.</li>
        </ul>
        <p>You can delete or block cookies in your browser’s settings. The site still works without them, though you’ll need to sign in again.</p>

        <h2>Analytics</h2>
        <p>To understand which pages and wallpapers people visit, we use two tools:</p>
        <ul>
          <li><b>Vercel Web Analytics</b>, which counts page views, countries, devices and the sites visitors came from. It doesn’t use cookies and doesn’t identify you.</li>
          <li><b>Google Analytics</b>, which uses cookies to measure visits and how the site is used. Google processes this data under its own privacy policy. You can opt out with the <a href="https://tools.google.com/dlpage/gaoptout" target="_blank" rel="noopener">Google Analytics opt-out add-on</a>.</li>
        </ul>

        <h2>Advertising</h2>
        <p>Offscreen shows ads served by <b>Google AdSense</b>, which keep the site free.</p>
        <ul>
          <li>Third-party vendors, including Google, use cookies to serve ads based on your prior visits to this website or other websites.</li>
          <li>Google’s use of advertising cookies enables it and its partners to serve ads to you based on your visit to this site and/or other sites on the internet.</li>
          <li>You can opt out of personalised advertising in <a href="https://adssettings.google.com" target="_blank" rel="noopener">Google’s Ads Settings</a>. You can also opt out of some other vendors’ use of cookies for personalised advertising at <a href="https://www.aboutads.info/choices/" target="_blank" rel="noopener">aboutads.info</a>.</li>
        </ul>
        <p>Visitors in the European Economic Area, the UK and Switzerland are asked for consent before personalised ads or advertising cookies are used, through Google’s consent message. You can change your choice at any time from that message.</p>
        <p>Read <a href="https://policies.google.com/technologies/partner-sites" target="_blank" rel="noopener">how Google uses information from sites that use its services</a>.</p>

        <h2>Services that handle data for us</h2>
        <ul>
          <li><b>Vercel</b> hosts the website.</li>
          <li><b>Neon</b> hosts the database that holds accounts, likes and downloads.</li>
          <li><b>Cloudflare</b> stores and delivers the wallpaper images.</li>
          <li>An <b>email provider</b> sends sign-in codes.</li>
          <li><b>Google</b> provides “Continue with Google”, Google Analytics and AdSense.</li>
        </ul>
        <p>These providers may process data in countries other than your own.</p>

        <h2>How long we keep it</h2>
        <p>Account details, likes and downloads are kept for as long as your account exists. Sign-in codes expire within minutes. When an account is deleted, its likes, downloads and profile photo are deleted with it.</p>

        <h2>Your choices and rights</h2>
        <p>You can ask us to show you, correct or delete the information we hold about you, including deleting your account entirely. Open a request on <a href={CONTACT} target="_blank" rel="noopener">our GitHub page</a> saying what you’d like done, and we’ll reply there within 30 days. Please don’t post your email address or other personal details in it; we’ll confirm your account with you privately. Depending on where you live, you may also have the right to object to or restrict how your data is used, and to complain to your local data protection authority.</p>

        <h2>Children</h2>
        <p>Offscreen isn’t aimed at children under 13, and we don’t knowingly collect information from them. If you think a child has created an account, let us know through <a href={CONTACT} target="_blank" rel="noopener">our GitHub page</a> and we’ll delete it.</p>

        <h2>Changes to this policy</h2>
        <p>If what we collect or how we use it changes, we’ll update this page and the date at the top.</p>

        <h2>Contact</h2>
        <p>Questions about this policy or your data: <a href={CONTACT} target="_blank" rel="noopener">open a request on our GitHub page</a>.</p>

        <p className="legal-back"><Link className="link-arrow" href="/">Back to the gallery</Link></p>
      </article>
    </>
  );
}
