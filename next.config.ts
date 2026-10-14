import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // pg loads its Cloudflare socket support only on Cloudflare Workers, so the file tracer doesn't
  // see it; include it so the Cloudflare build (OpenNext) can bundle it
  outputFileTracingIncludes: { '/**/*': ['./node_modules/pg-cloudflare/**/*'] },
};

export default nextConfig;
