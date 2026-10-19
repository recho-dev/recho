function emitChange(listeners) {
  for (const listener of listeners) listener();
}

let count = 0;
// The runtime asked for along with a count, e.g. from the New menu.
let requested = {count: 0, runtime: undefined};
const counterListeners = new Set();

export const countStore = {
  /** Starts a new notebook, in `runtime` if given (e.g. from the New menu). */
  increment(runtime) {
    count++;
    requested = {count, runtime};
    emitChange(counterListeners);
  },
  subscribe(listener) {
    counterListeners.add(listener);
    return () => counterListeners.delete(listener);
  },
  getSnapshot() {
    return count;
  },
  getServerSnapshot() {
    return 0;
  },
  /**
   * The runtime asked for the new notebook of `count`, if any. It is keyed to
   * the count rather than cleared once read, so an effect that runs twice
   * (StrictMode, or a page that re-renders before the next mounts) still gets it.
   */
  runtimeFor(count) {
    return requested.count === count ? requested.runtime : undefined;
  },
};

let isDirty = false;
const dirtyListeners = new Set();

export const isDirtyStore = {
  setDirty(dirty) {
    isDirty = dirty;
    emitChange(dirtyListeners);
  },
  subscribe(listener) {
    dirtyListeners.add(listener);
    return () => dirtyListeners.delete(listener);
  },
  getSnapshot() {
    return isDirty;
  },
  getServerSnapshot() {
    return false;
  },
};
