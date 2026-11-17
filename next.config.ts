import type { NextConfig } from "next";

/** Long-lived cache for versioned public brand assets (`?v=` invalidates). */
const BRAND_ASSET_CACHE_CONTROL = "public, max-age=31536000, immutable";

const nextConfig: NextConfig = {
  // Allow the physical iPhone (LAN) to load Next.js /_next dev resources
  // when opening http://172.20.10.6:3000 instead of localhost.
  allowedDevOrigins: ["172.20.10.6"],

  // Enable forbidden()/unauthorized() auth interrupts (Access Restricted UI).
  experimental: {
    authInterrupts: true,
  },

  // Hide the bottom-left Next.js route indicator in local development.
  // Compile/runtime errors still surface normally.
  devIndicators: false,

  // Allow cache-busted /logo.png?v=… while keeping other local public assets optimizable.
  images: {
    localPatterns: [
      {
        pathname: "/logo.png",
        search: "?v=8E81A81F",
      },
      {
        pathname: "/**",
        search: "",
      },
    ],
  },

  async headers() {
    return [
      {
        source: "/logo.png",
        headers: [{ key: "Cache-Control", value: BRAND_ASSET_CACHE_CONTROL }],
      },
      {
        source: "/favicon.svg",
        headers: [{ key: "Cache-Control", value: BRAND_ASSET_CACHE_CONTROL }],
      },
      {
        source: "/favicon.ico",
        headers: [{ key: "Cache-Control", value: BRAND_ASSET_CACHE_CONTROL }],
      },
      {
        source: "/apple-touch-icon.png",
        headers: [{ key: "Cache-Control", value: BRAND_ASSET_CACHE_CONTROL }],
      },
    ];
  },

  // Keep the foundation predictable; Cache Components can be enabled later.
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
