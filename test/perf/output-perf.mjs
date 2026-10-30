// Headless browser benchmark of how the editor draws output. Writes an 80×40
// output block once per animation frame (60 updates/s) and reports the
// milliseconds each update takes (transaction, CodeMirror's measure pass,
// style and layout) for two scenarios:
//
//   plain      ASCII animation, no colour
//   truecolor  every character in its own truecolor, all changing (worst case)
//
//   pnpm perf:output                       # this checkout
//   pnpm perf:output --root ../other-tree  # another checkout, e.g. the old renderer
//   pnpm perf:output --frames 600
//
// Needs a Chromium: set CHROMIUM_PATH, or it uses Playwright's cached
// headless shell. Not part of `pnpm test`: timings depend on the machine.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import {fileURLToPath} from "node:url";
import {parseArgs} from "node:util";
import {createServer} from "vite";
import {chromium} from "playwright-core";

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, "..", "..");
const {values} = parseArgs({
  options: {
    root: {type: "string", default: repo},
    frames: {type: "string", default: "300"},
    scenario: {type: "string", multiple: true, default: ["plain", "truecolor"]},
  },
});
const root = path.resolve(values.root);
const frames = Number(values.frames);

function findChromium() {
  if (process.env.CHROMIUM_PATH) return process.env.CHROMIUM_PATH;
  const cache = path.join(os.homedir(), "Library", "Caches", "ms-playwright");
  const linuxCache = path.join(os.homedir(), ".cache", "ms-playwright");
  for (const dir of [cache, linuxCache]) {
    if (!fs.existsSync(dir)) continue;
    const shells = fs
      .readdirSync(dir)
      .filter((d) => d.startsWith("chromium_headless_shell-"))
      .sort()
      .reverse();
    for (const shell of shells) {
      for (const sub of [
        "chrome-headless-shell-mac-arm64",
        "chrome-headless-shell-mac-x64",
        "chrome-headless-shell-linux64",
      ]) {
        const exe = path.join(dir, shell, sub, "chrome-headless-shell");
        if (fs.existsSync(exe)) return exe;
      }
    }
  }
  throw new Error("No Chromium found: set CHROMIUM_PATH");
}

// The page lives here; the editor it benchmarks comes from `root`.
const server = await createServer({
  configFile: false,
  root: here,
  logLevel: "error",
  resolve: {alias: [{find: /^\/@recho\//, replacement: root + "/"}]},
  define: {"process.env.NODE_ENV": JSON.stringify("production")},
  css: {postcss: root},
  server: {port: 0, fs: {allow: [repo, root]}},
  optimizeDeps: {entries: [path.join(here, "output-perf.html")]},
});
await server.listen();
const url = server.resolvedUrls.local[0] + "output-perf.html";

const browser = await chromium.launch({
  executablePath: findChromium(),
  args: ["--use-mock-keychain", "--password-store=basic"],
});
try {
  const page = await browser.newPage({viewport: {width: 1280, height: 1100}});
  page.on("pageerror", (error) => console.error("page error:", error.message));
  await page.goto(url);
  await page.waitForFunction(() => window.benchmarkReady, null, {timeout: 120000});
  console.log(`root: ${root}`);
  console.log("scenario    frames  bytes/frame  rows  median ms  p95 ms  max ms  frame p95 ms");
  for (const scenario of values.scenario) {
    const r = await page.evaluate((options) => window.runBenchmark(options), {scenario, frames});
    if (!r.correct) throw new Error(`${scenario}: the document didn't end on the last frame`);
    console.log(
      [
        scenario.padEnd(10),
        String(r.frames).padStart(6),
        String(r.bytesPerFrame).padStart(12),
        String(r.outputRows).padStart(5),
        r.median.toFixed(2).padStart(10),
        r.p95.toFixed(2).padStart(7),
        r.max.toFixed(2).padStart(7),
        r.frameIntervalP95.toFixed(1).padStart(13),
      ].join(" "),
    );
  }
} finally {
  await browser.close();
  await server.close();
}
