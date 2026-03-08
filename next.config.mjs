/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    unoptimized: true,
    domains: ["uploads.mangadex.org"],
  },
};

export default nextConfig;
