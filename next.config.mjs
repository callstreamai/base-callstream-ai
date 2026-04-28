/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  experimental: {
    serverActions: { bodySizeLimit: '20mb' },
  },
};

export default nextConfig;
