import {
  GithubAuthProvider,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
} from "firebase/auth";
import {getFirebase} from "./firebase.js";
import {flushPendingSave, uploadLocalNotebooks} from "./api.js";

const PROVIDERS = {github: GithubAuthProvider, google: GoogleAuthProvider};

const SERVER_STATE = {user: null, loading: true, menuOpen: false};

let state = SERVER_STATE;
let initialized = false;
let signingIn = false;
let loginWaiters = [];
const listeners = new Set();

function setState(patch) {
  state = {...state, ...patch};
  for (const listener of listeners) listener();
}

function resolveLoginWaiters(user) {
  const waiters = loginWaiters;
  loginWaiters = [];
  for (const resolve of waiters) resolve(user);
}

function init() {
  if (initialized) return;
  initialized = true;
  onAuthStateChanged(getFirebase().auth, async (user) => {
    if (user) {
      // Move notebooks created before logging in to the cloud. If this fails,
      // they stay in localStorage, are listed alongside cloud notebooks, and
      // the upload is retried on the next page load.
      await uploadLocalNotebooks(user).catch((error) => console.error("Failed to upload local notebooks", error));
    }
    setState({user, loading: false});
    if (user) resolveLoginWaiters(user);
  });
}

export const authStore = {
  openMenu() {
    setState({menuOpen: true});
  },
  closeMenu() {
    setState({menuOpen: false});
    if (!signingIn) resolveLoginWaiters(null);
  },
  async signIn(provider) {
    signingIn = true;
    setState({menuOpen: false});
    try {
      await signInWithPopup(getFirebase().auth, new PROVIDERS[provider]());
    } catch (error) {
      if (error.code !== "auth/popup-closed-by-user" && error.code !== "auth/cancelled-popup-request") {
        console.error(error);
        alert(`Failed to log in: ${error.message}`);
      }
      resolveLoginWaiters(null);
    } finally {
      signingIn = false;
    }
  },
  async signOut() {
    flushPendingSave();
    setState({menuOpen: false});
    await firebaseSignOut(getFirebase().auth);
  },
  subscribe(listener) {
    init();
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  getSnapshot() {
    return state;
  },
  getServerSnapshot() {
    return SERVER_STATE;
  },
};

// Resolves with the logged-in user, asking the user to log in first if needed.
// Resolves with null if the user dismisses the login menu.
export function ensureUser() {
  if (state.user) return Promise.resolve(state.user);
  return new Promise((resolve) => {
    loginWaiters.push(resolve);
    window.scrollTo({top: 0, behavior: "smooth"});
    authStore.openMenu();
  });
}
