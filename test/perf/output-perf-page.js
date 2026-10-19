// The page that output-perf.mjs drives: an editor of the notebook under test
// (aliased to /@recho/, see output-perf.mjs) whose output block is replaced
// by a new frame on every update, the way the runtime writes it.
import "/@recho/app/tokens.css";
import "/@recho/app/fonts.css";
import "/@recho/editor/index.css";
import {createEditor} from "/@recho/editor/index.js";

const PREFIX = "//➜ ";
const RAMP = " .:-=+*#%@";

/** A plain ASCII frame: interfering waves drawn with a density ramp. */
function plainFrame(t, width, height) {
  const lines = [];
  for (let y = 0; y < height; y++) {
    let line = "";
    for (let x = 0; x < width; x++) {
      const v = Math.sin(x / 6 + t / 7) + Math.sin(y / 4 - t / 11) + Math.sin((x + y) / 9 + t / 5);
      line += RAMP[Math.floor(((v + 3) / 6) * (RAMP.length - 1))];
    }
    lines.push(line);
  }
  return lines;
}

/** The worst case: every character in its own truecolor, all changing every frame. */
function truecolorFrame(t, width, height) {
  const lines = [];
  for (let y = 0; y < height; y++) {
    let line = "";
    for (let x = 0; x < width; x++) {
      const r = (x * 3 + t * 5) & 255;
      const g = (y * 6 + t * 3) & 255;
      const b = (x * y + t * 7) & 255;
      line += `\x1b[38;2;${r};${g};${b}m${RAMP[(x + y + t) % RAMP.length]}`;
    }
    lines.push(line + "\x1b[39m");
  }
  return lines;
}

const FRAMES = {plain: plainFrame, truecolor: truecolorFrame};

// The span of `next` that differs from `prev`, as the runtime trims changes.
function trimmedChange(prev, next, offset) {
  let start = 0;
  const max = Math.min(prev.length, next.length);
  while (start < max && prev.charCodeAt(start) === next.charCodeAt(start)) start++;
  let end = 0;
  while (end < max - start && prev.charCodeAt(prev.length - 1 - end) === next.charCodeAt(next.length - 1 - end)) end++;
  return {from: offset + start, to: offset + prev.length - end, insert: next.slice(start, next.length - end)};
}

function percentile(sorted, p) {
  return sorted[Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * p))];
}

/**
 * Writes `frames` frames of `scenario` into the output block, one per
 * animation frame (60 updates/s), and times each update: the transaction,
 * CodeMirror's measure pass and the browser's style and layout.
 */
window.runBenchmark = async function ({scenario, width = 80, height = 40, frames = 300, warmup = 30}) {
  const frame = FRAMES[scenario];
  const output = (t) =>
    frame(t, width, height)
      .map((line) => PREFIX + line)
      .join("\n");
  const code = `const frame = recho.interval(16);\n\n${output(0)}\necho(frame);\n`;
  const container = document.getElementById("editor");
  container.textContent = "";
  const editor = createEditor(container, {code});
  const view = container.querySelector(".cm-content").cmTile.root.view;
  const offset = code.indexOf(PREFIX);
  let prev = output(0);
  const times = [];
  const intervals = [];
  let last = 0;
  for (let t = 1; t <= frames + warmup; t++) {
    await new Promise(requestAnimationFrame);
    const now = performance.now();
    if (last && t > warmup) intervals.push(now - last);
    last = now;
    const next = output(t);
    const start = performance.now();
    view.dispatch({changes: trimmedChange(prev, next, offset)});
    view.measure();
    void view.dom.getBoundingClientRect();
    void document.body.offsetHeight;
    const elapsed = performance.now() - start;
    if (t > warmup) times.push(elapsed);
    prev = next;
  }
  const check = view.state.doc.toString().slice(offset, offset + prev.length) === prev;
  // Output rows drawn at the end: both renderers mark them .cm-output-line.
  const outputRows = container.querySelectorAll(".cm-output-line").length;
  editor.destroy();
  times.sort((a, b) => a - b);
  intervals.sort((a, b) => a - b);
  return {
    scenario,
    frames: times.length,
    bytesPerFrame: prev.length,
    median: percentile(times, 0.5),
    p95: percentile(times, 0.95),
    max: times[times.length - 1],
    frameIntervalP95: percentile(intervals, 0.95),
    correct: check,
    outputRows,
  };
};

window.benchmarkReady = true;
