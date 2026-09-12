import type { NextConfig } from "next";

const cspHeader = `
  default-src 'self';
  script-src 'self' 'unsafe-eval' 'unsafe-inline' https://checkout.razorpay.com;
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  font-src 'self' https://fonts.gstatic.com;
  connect-src 'self' https://*.supabase.co https://api.openai.com https://accounts.google.com https://generativelanguage.googleapis.com wss://generativelanguage.googleapis.com https://*.blob.core.windows.net https://*.microsoftonline.com https://*.ciamlogin.com https://lumberjack.razorpay.com https://api.razorpay.com;
  img-src 'self' blob: data: https: https://*.blob.core.windows.net https://*.razorpay.com;
  media-src 'self' blob: data:;
  frame-src 'self' https://accounts.google.com https://api.razorpay.com;
`.replace(/\s{2,}/g, ' ').trim();

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  env: {
    NEXT_PUBLIC_SUPABASE_URL:
      process.env.NEXT_PUBLIC_SUPABASE_URL ||
      "https://pllcuqjbaulowcnpwske.supabase.co",
    NEXT_PUBLIC_SUPABASE_ANON_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsbGN1cWpiYXVsb3djbnB3c2tlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU5MTEwMzQsImV4cCI6MjEwMTQ4NzAzNH0.HtoZJjkzd87WR1qBwFavciLEqtbX8pZ0Be5Sbq3QRh0",
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: cspHeader,
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(self), geolocation=()',
          },
        ],
      },
    ];
  },
  serverExternalPackages: ['@google/genai', 'ws', 'bufferutil', 'utf-8-validate', '@azure/storage-blob', '@azure/identity', 'pg'],
};

export default nextConfig;
