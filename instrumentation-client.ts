// PostHog product analytics: page views, clicks and sessions. Runs in the browser before the app
// starts. Events go to /ph on this site (proxied to PostHog in next.config.ts) so ad blockers
// don't drop them. Off until NEXT_PUBLIC_POSTHOG_KEY is set (see .env.example).
import posthog from 'posthog-js';

const KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;

if (KEY) {
  posthog.init(KEY, {
    api_host: '/ph',
    ui_host: 'https://us.posthog.com',
    // the '2025-05-24' defaults also count page views on client-side navigation between pages
    defaults: '2025-05-24',
    person_profiles: 'identified_only',
  });
}
