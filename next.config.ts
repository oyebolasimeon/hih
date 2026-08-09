import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Produces a self-contained Node server for cPanel "Setup Node.js App"
  output: "standalone",
  // Keep Turbopack rooted on this project (avoids parent-folder lockfile warning)
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;
