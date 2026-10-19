/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  experimental: {
    agentFeedback: true,
  },
  allowedDevOrigins: [
    '192.168.10.117',
    '192.168.10.117:3000',
    '192.168.10.117:3003',
    'localhost:3000',
    'localhost:3003',
    '127.0.0.1:3000',
    '127.0.0.1:3003',
  ],
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
