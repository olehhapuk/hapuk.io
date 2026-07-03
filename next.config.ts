import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  // Lean, self-contained server output for container deploys.
  output: 'standalone',
  // Playwright is a native Node dependency — keep it external to the server bundle.
  serverExternalPackages: ['playwright', 'playwright-core'],
};

export default nextConfig;
