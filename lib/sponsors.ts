// Who sponsors Offscreen. Empty slots show a "your brand here" card that invites brands to get in
// touch, so the section is always there; add a sponsor below and it takes the first open slot.
export type Sponsor = {
  name: string;
  tagline: string; // one line, about 90 characters at most
  url: string;
  logo: string; // a square image
};

export const SPONSORS: Sponsor[] = [];

// how many sponsors are shown at once (kept few on purpose)
export const SPONSOR_SLOTS = 3;

// who visits, for the sponsor page. The site doesn't count visits itself (PostHog and Google Analytics
// do), so these are typed in: from the Vercel Web Analytics export of launch week, 8–15 Oct 2026
// (analytics-archive/). Visitors and page views only grow, so "+" stays true; update them from PostHog.
export const AUDIENCE = {
  visitors: 28234,
  pageViews: 53687,
  countries: 146,
  mobileShare: 82, // % of visitors on a phone
  iphoneShare: 55, // % on iOS
  topCountries: ['India', 'United States', 'Canada', 'United Kingdom'],
};

// where brands get in touch: a message on X for now (a sponsor email can replace it later)
export const SPONSOR_CONTACT = 'https://x.com/anjalisinggh12';
export const SPONSOR_HANDLE = '@anjalisinggh12';
