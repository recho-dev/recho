import type {MouseSample} from "./types.ts";

const THROTTLE_MS = 50;
const MIN_DISTANCE_PX = 3;

export interface MouseTrackerHandle {
  destroy: () => void;
}

export function createMouseTracker(
  container: HTMLElement,
  onSample: (sample: MouseSample) => void,
): MouseTrackerHandle {
  const startTime = Date.now();
  let lastX = -Infinity;
  let lastY = -Infinity;
  let lastRecordTime = 0;

  function handleMouseMove(e: globalThis.MouseEvent) {
    const now = Date.now();

    // Throttle: skip if too soon since last record
    if (now - lastRecordTime < THROTTLE_MS) return;

    const rect = container.getBoundingClientRect();
    const x = Math.round(e.clientX - rect.left);
    const y = Math.round(e.clientY - rect.top);

    // De-duplication: skip if cursor barely moved
    const dx = x - lastX;
    const dy = y - lastY;
    if (dx * dx + dy * dy < MIN_DISTANCE_PX * MIN_DISTANCE_PX) return;

    lastX = x;
    lastY = y;
    lastRecordTime = now;

    onSample({
      timestamp: now - startTime,
      x,
      y,
    });
  }

  container.addEventListener("mousemove", handleMouseMove);

  return {
    destroy() {
      container.removeEventListener("mousemove", handleMouseMove);
    },
  };
}
