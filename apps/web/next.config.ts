import type { NextConfig } from 'next';
import path from 'node:path';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typedRoutes: true,
  output: 'standalone',
  outputFileTracingRoot: path.join(process.cwd(), '../..')
};

export default nextConfig;
