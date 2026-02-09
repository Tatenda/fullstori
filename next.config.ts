import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Disable Turbopack temporarily to use webpack instead
  // This resolves the workspace root detection issue
};

export default nextConfig;
