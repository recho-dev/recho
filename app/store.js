function emitChange(listeners) {
  for (const listener of listeners) listener();
}

let count = 0;
let nextRuntime = undefined;
const counterListeners = new Set();

export const countStore = {
  /** Starts a new notebook, in `runtime` if given (e.g. from the New menu). */
  increment(runtime) {
    nextRuntime = runtime;
    count++;
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
  /** The runtime asked for the next new notebook, once. */
  takeRuntime() {
    const runtime = nextRuntime;
    nextRuntime = undefined;
    return runtime;
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
