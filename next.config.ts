import type { NextConfig } from "next";
import path from "path";

// Standalone is for cPanel self-host. On Vercel Next skips writing
// next-server.js.nft.json, then the standalone NFT step fails with ENOENT.
const useStandalone =
  process.env.VERCEL !== "1" && process.env.DISABLE_STANDALONE !== "1";

const nextConfig: NextConfig = {
  ...(useStandalone ? { output: "standalone" as const } : {}),
  // Keep Turbopack rooted on this project (avoids parent-folder lockfile warning)
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;
