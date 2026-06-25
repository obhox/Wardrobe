import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Standalone output so the Docker image stays small (only the server + traced deps).
  output: "standalone",
  // Folder name contains a space; pin the Turbopack root to silence root inference.
  turbopack: {
    root: path.join(__dirname),
  },
  // argon2 is a native module — keep it external to the server bundle.
  serverExternalPackages: ["argon2", "@simplewebauthn/server", "open-graph-scraper"],
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
};

export default nextConfig;
