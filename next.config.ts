import type { NextConfig } from 'next';

const developmentConnectPolicy =
  process.env.NODE_ENV === 'development'
    ? "connect-src 'self' ws: wss:"
    : "connect-src 'none'";

const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  developmentConnectPolicy,
  "font-src 'self'",
  "form-action 'none'",
  "frame-ancestors 'none'",
  "img-src 'self' blob: data:",
  "object-src 'none'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "worker-src 'self' blob:",
].join('; ');

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: contentSecurityPolicy },
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },
          { key: 'Referrer-Policy', value: 'no-referrer' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          {
            key: 'X-Robots-Tag',
            value:
              process.env.ALLOW_INDEXING === 'false'
                ? 'noindex, nofollow, noarchive'
                : 'index, follow',
          },
          {
            key: 'Permissions-Policy',
            value:
              'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
