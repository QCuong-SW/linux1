import type { NextConfig } from 'next';
import path from 'node:path';

const nextConfig: NextConfig = {
  output: 'standalone',
  outputFileTracingRoot: path.resolve(process.cwd(), '..'),
  poweredByHeader: false,
  async rewrites() {
    const backend = (process.env.BACKEND_API_URL || 'http://127.0.0.1:3001/api').replace(/\/$/, '');
    return [{ source: '/api/:path*', destination: `${backend}/:path*` }];
  },
};

export default nextConfig;
