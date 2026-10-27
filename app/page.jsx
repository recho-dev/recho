"use client";
import {useEffect, useState, useSyncExternalStore} from "react";
import {EditorPage} from "./EditorPage.jsx";
import {HomePage} from "./HomePage.jsx";
import {authStore} from "./auth.js";
import {countStore} from "./store.js";

// Logged in, "/" is the home page. Logged out, it is a new notebook, as before.
export default function Page() {
  const {user, loading} = useSyncExternalStore(authStore.subscribe, authStore.getSnapshot, authStore.getServerSnapshot);
  const count = useSyncExternalStore(countStore.subscribe, countStore.getSnapshot, countStore.getServerSnapshot);
  // A notebook started while logged out stays open when its owner logs in to
  // create it. The wordmark (a new count) goes back to the home page.
  const [editing, setEditing] = useState(false);
  useEffect(() => {
    if (!loading) setEditing(!user);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, count]);
  useEffect(() => {
    if (!loading && !user) setEditing(true);
  }, [loading, user]);

  // Wait for auth, so neither page shows and then gives way to the other.
  if (loading) return null;
  return editing || !user ? <EditorPage /> : <HomePage user={user} />;
}
