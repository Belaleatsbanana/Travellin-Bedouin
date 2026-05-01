/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "via.placeholder.com" },
    ],
  },
  // Proxy /api/* to the backend so the browser never needs a public backend URL.
  // NEXT_PUBLIC_API_BASE_URL should be set to "" (empty) — all API calls become
  // relative (e.g. /api/sessions) and are forwarded server-side to the backend.
  async rewrites() {
    const backendUrl = process.env.BACKEND_URL ?? "http://localhost:8000";
    return [
      {
        source: "/api/:path*",
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
