import type { NextConfig } from "next";
import path from "path";

const dev = process.env.NODE_ENV !== "production";

// Image bucket origin (S3_PUBLIC_URL) — item photos load straight from it.
function origin(url: string | undefined) {
  try {
    return url ? new URL(url).origin : "";
  } catch {
    return "";
  }
}
const storage = origin(process.env.S3_PUBLIC_URL);
// background-removal model files (see src/lib/cutout.ts)
const imgly = origin(process.env.NEXT_PUBLIC_IMGLY_PUBLIC_PATH) || "https://staticimgly.com";

// Every screen behind sign-in (src/app/(app)). They share one policy because a
// policy belongs to the document: moving between them is a client-side route
// change, so the page you arrived on must already allow what the closet needs.
const APP_ROUTES = ["/studio", "/studio/:path*", "/you"];

// `evalAllowed`: the closet runs in-browser background removal, whose ndarray
// dependency builds functions with `new Function` — so only the signed-in app
// gets 'unsafe-eval'. Everything else (landing, guest share pages) stays stricter.
const csp = (evalAllowed: boolean) => [
  "default-src 'self'",
  // Next's inline bootstrap needs 'unsafe-inline'; background removal needs
  // WASM plus the ONNX runtime's blob: glue script
  `script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' blob: https://a.falorb.com ${imgly}${dev || evalAllowed ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self'",
  `img-src 'self' data: blob: ${storage}`.trim(),
  `connect-src 'self' blob: data: https://a.falorb.com ${imgly} ${storage}${dev ? " ws:" : ""}`.trim(),
  "worker-src 'self' blob:",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const securityHeaders = (evalAllowed = false) => [
  { key: "Content-Security-Policy", value: csp(evalAllowed) },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  ...(dev
    ? []
    : [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }]),
];

const nextConfig: NextConfig = {
  // Standalone output so the Docker image stays small (only the server + traced deps).
  output: "standalone",
  // Folder name contains a space; pin the Turbopack root to silence root inference.
  turbopack: {
    root: path.join(__dirname),
  },
  // native / heavy server deps stay external to the server bundle
  serverExternalPackages: ["argon2", "@simplewebauthn/server", "open-graph-scraper", "sharp"],
  poweredByHeader: false,
  async headers() {
    // later rules override earlier ones for the same header key
    return [
      { source: "/:path*", headers: securityHeaders() },
      ...APP_ROUTES.map((source) => ({ source, headers: securityHeaders(true) })),
    ];
  },
};

export default nextConfig;
