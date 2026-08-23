import type { NextConfig } from "next";

/**
 * NordPrint storefront configuration.
 *
 * `transpilePackages` compiles the workspace UI package from source, which is
 * what keeps its `"use client"` directives intact — see packages/ui/README.md.
 */
const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,

  transpilePackages: ["@nordprint/ui"],

  // Docker: emit a self-contained server bundle so the runtime image does not
  // need the whole monorepo's node_modules.
  output: "standalone",
  outputFileTracingRoot: new URL("../../", import.meta.url).pathname,

  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      // Product images come from S3-compatible object storage (R2 in
      // production, MinIO locally). The host is configuration, never a literal.
      ...(process.env.NEXT_PUBLIC_IMAGE_HOSTNAME
        ? [
            {
              protocol: "https" as const,
              hostname: process.env.NEXT_PUBLIC_IMAGE_HOSTNAME,
            },
          ]
        : []),
      { protocol: "http" as const, hostname: "localhost" },
    ],
  },

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Permissions-Policy",
            value: "geolocation=(), microphone=(), camera=(), interest-cohort=()",
          },
        ],
      },
    ];
  },

  async redirects() {
    return [
      // Legacy/typo-friendly aliases for the Danish URLs.
      { source: "/produkt", destination: "/produkter", permanent: true },
      { source: "/cart", destination: "/kurv", permanent: true },
      { source: "/account/:path*", destination: "/konto/:path*", permanent: true },
    ];
  },
};

export default nextConfig;
