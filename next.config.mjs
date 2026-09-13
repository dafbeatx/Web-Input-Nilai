/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ['sharp'],
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'fwhdjqvtjzesbdcqorsn.supabase.co',
      },
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
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "frame-ancestors 'self' https://smart-absensi-guru-eight.vercel.app https://*.vercel.app http://localhost:* http://127.0.0.1:*;",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
