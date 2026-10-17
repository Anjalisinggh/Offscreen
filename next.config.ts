import type { NextConfig } from 'next';

// On the API server (api.offscreen.wtf), the site at SITE_ORIGIN calls /api from the browser with
// the login cookie; only that origin is allowed to.
const SITE_ORIGIN = (process.env.SITE_ORIGIN || '').replace(/\/$/, '');

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // the dev-only Next.js badge goes bottom right, out of the way of the sponsor cards (bottom left)
  devIndicators: { position: 'bottom-right' },
  // pg loads its Cloudflare socket support only on Cloudflare Workers, so the file tracer doesn't
  // see it; include it so the Cloudflare build (OpenNext) can bundle it
  outputFileTracingIncludes: { '/**/*': ['./node_modules/pg-cloudflare/**/*'] },
  // one address for the site: www.offscreen.wtf → offscreen.wtf, so sign-in, cookies and the
  // Google callback always use the same domain
  async redirects() {
    return [{
      source: '/:path*',
      has: [{ type: 'host', value: 'www.offscreen.wtf' }],
      destination: 'https://offscreen.wtf/:path*',
      permanent: true,
    }];
  },
  async headers() {
    if (!SITE_ORIGIN) return [];
    return [{
      source: '/api/:path*',
      headers: [
        { key: 'Access-Control-Allow-Origin', value: SITE_ORIGIN },
        { key: 'Access-Control-Allow-Credentials', value: 'true' },
        { key: 'Access-Control-Allow-Methods', value: 'GET, POST, PUT, DELETE, OPTIONS' },
        { key: 'Access-Control-Allow-Headers', value: 'Content-Type' },
        { key: 'Access-Control-Max-Age', value: '86400' },
        { key: 'Vary', value: 'Origin' },
      ],
    }];
  },
  // PostHog analytics (instrumentation-client.ts) sends events here (on the API server, when the
  // site has one), and they're passed on to PostHog's US servers, so ad blockers that block
  // posthog.com don't drop them
  async rewrites() {
    return [
      { source: '/ph/static/:path*', destination: 'https://us-assets.i.posthog.com/static/:path*' },
      { source: '/ph/:path*', destination: 'https://us.i.posthog.com/:path*' },
    ];
  },
  // PostHog's API paths end in a slash; keep Next from redirecting them away
  skipTrailingSlashRedirect: true,
};

export default nextConfig;
