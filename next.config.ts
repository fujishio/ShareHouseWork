import type { NextConfig } from "next";

const useAuthEmulator = process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === "true";
const isDevelopment = process.env.NODE_ENV !== "production";

const connectSrc = [
  "'self'",
  "https://*.googleapis.com",
  "https://*.firebaseio.com",
  "https://*.gstatic.com",
];

if (isDevelopment && useAuthEmulator) {
  connectSrc.push("http://127.0.0.1:9099", "http://localhost:9099");
}

const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: `default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; connect-src ${connectSrc.join(" ")}; font-src 'self' data:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'`,
  },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
