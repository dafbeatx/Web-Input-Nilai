/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'uploads.mangadex.org',
      },
      {
        protocol: 'https',
        hostname: '*.mangadex.network',
      },
      {
        protocol: 'https',
        hostname: 's2.mangadex.org',
      },
    ],
  },
};

export default nextConfig;
