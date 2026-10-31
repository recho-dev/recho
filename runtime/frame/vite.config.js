import {fileURLToPath} from "node:url";
import {defineConfig} from "vite";

// Builds the runtime page (./index.html), which the editor loads in an iframe
// from another site (see ../../editor/remoteRuntime.js). It's deployed on its
// own, e.g. as a static Vercel project with output directory runtime/frame/dist.
export default defineConfig({
  root: fileURLToPath(new URL(".", import.meta.url)),
  base: "./",
  define: {
    "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV ?? "production"),
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    target: "es2022",
  },
  worker: {format: "es"},
  server: {port: 5174, strictPort: true},
  preview: {port: 5174, strictPort: true},
});
