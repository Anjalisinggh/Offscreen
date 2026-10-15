import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  poweredByHeader: false,
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
};

export default nextConfig;
