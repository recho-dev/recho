/**
 * Next's minifier (SWC's compress) breaks the MLscript compiler, which is
 * Scala.js output: it fails an assertion when it starts. The compiler's chunk
 * is marked as minimized before Next minifies the rest, so it's left as is.
 * It is only downloaded by MLscript notebooks, in their compiler worker
 * (runtime/languages/mlscript.worker.js).
 */
class KeepMLscriptCompiler {
  apply(compiler) {
    const {Compilation} = compiler.webpack;
    compiler.hooks.compilation.tap("KeepMLscriptCompiler", (compilation) => {
      compilation.hooks.processAssets.tap(
        {name: "KeepMLscriptCompiler", stage: Compilation.PROCESS_ASSETS_STAGE_OPTIMIZE_SIZE - 1},
        () => {
          for (const chunk of compilation.chunks) {
            const modules = compilation.chunkGraph.getChunkModules(chunk);
            if (!modules.some((m) => /[\\/]@mlscript[\\/]recho[\\/]dist[\\/]MLscript\.mjs$/.test(m.resource ?? "")))
              continue;
            for (const file of chunk.files) compilation.updateAsset(file, (source) => source, {minimized: true});
          }
        },
      );
    });
  }
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Example thumbnails run web-tree-sitter at build time; bundled, its
  // Emscripten loader can't find Node's `module`, so Node loads it as is.
  serverExternalPackages: ["web-tree-sitter"],
  webpack(config, {dev, isServer}) {
    if (!dev) config.plugins.push(new KeepMLscriptCompiler());
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
