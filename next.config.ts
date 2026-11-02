import type { NextConfig } from "next";
import { ALLOWED_IMAGE_HOSTS } from "./src/lib/image-hosts";

const isProduction = process.env.NODE_ENV === "production";
const allowedImageSources = ALLOWED_IMAGE_HOSTS.map(
  (host) => `https://${host}`,
).join(" ");

// 生产环境才下发 CSP：开发环境需要 Next 的 eval / HMR，强 CSP 会打断热更新。
const contentSecurityPolicy = isProduction
  ? [
      "default-src 'self'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "object-src 'none'",
      `img-src 'self' data: blob: ${allowedImageSources}`,
      "font-src 'self' data:",
      "style-src 'self' 'unsafe-inline'",
      "script-src 'self' 'unsafe-inline'",
      "connect-src 'self'",
    ].join("; ")
  : null;

const securityHeaders: { key: string; value: string }[] = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
];

if (contentSecurityPolicy) {
  securityHeaders.push({
    key: "Content-Security-Policy",
    value: contentSecurityPolicy,
  });
}

if (isProduction) {
  securityHeaders.push({
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains",
  });
}

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Cache Components 会要求所有读取 cookie/session 的页面包 Suspense，
  // 对这个小项目来说只会增加噪音，先用 Next 15 时代的经典动态渲染模型。
  cacheComponents: false,
  images: {
    remotePatterns: ALLOWED_IMAGE_HOSTS.map((hostname) => ({
      protocol: "https" as const,
      hostname,
    })),
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
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
