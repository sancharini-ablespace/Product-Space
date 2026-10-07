import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Notes upload attachments through a server action. Each file is capped at
    // 5 MB in addNote(); these limits leave room for several files per note.
    serverActions: { bodySizeLimit: "26mb" },
    proxyClientMaxBodySize: "26mb",
  },
};

export default nextConfig;
