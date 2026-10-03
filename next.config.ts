import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // native/Node-only packages are loaded at runtime rather than bundled
  serverExternalPackages: ['sharp', 'pg'],
  poweredByHeader: false,
};

export default nextConfig;
