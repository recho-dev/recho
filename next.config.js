/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack(config, {isServer}) {
    // web-tree-sitter (MLscript highlighting) imports these only under Node.
    if (!isServer) config.resolve.fallback = {...config.resolve.fallback, "fs/promises": false, module: false};
    return config;
  },
  async redirects() {
    return [
      {
        source: "/notebook/:path*",
        destination: "/:path*",
        permanent: true,
      },
      {
        source: "/multiples",
        destination: "https://recho-multiples.vercel.app/",
        permanent: true,
      },
      {
        source: "/melody",
        destination: "https://recho-melody.vercel.app/",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
