"use client";
import {useState, useEffect, useSyncExternalStore} from "react";
import Link from "next/link";
import {Trash2} from "lucide-react";
import {ThumbnailClient} from "../ThumbnailClient.js";
import {getNotebooks, deleteNotebook, PUBLIC} from "../api.js";
import {authStore, ensureUser} from "../auth.js";
import {findFirstOutputRange, highlightLanguage} from "../shared.js";
import {cn} from "../cn.js";
import {Button} from "../../components/Button.jsx";
import {Card} from "../../components/Card.jsx";
import {toast} from "../../components/Toast.jsx";

export default function Page() {
  const [notebooks, setNotebooks] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const {user, loading} = useSyncExternalStore(authStore.subscribe, authStore.getSnapshot, authStore.getServerSnapshot);
  const uid = user?.uid ?? null;

  useEffect(() => {
    if (loading) return;
    let cancelled = false;
    setLoadError(null);
    getNotebooks()
      .then((notebooks) => !cancelled && setNotebooks(notebooks))
      .catch((error) => {
        console.error(error);
        if (!cancelled) setLoadError(error);
      });
    return () => (cancelled = true);
  }, [loading, uid, reloadKey]);

  useEffect(() => {
    document.title = "Notebooks | Recho";
  }, []);

  async function onDelete(id) {
    try {
      if (!(await deleteNotebook(id))) return;
      setNotebooks((notebooks) => notebooks.filter((notebook) => notebook.id !== id));
    } catch (error) {
      console.error(error);
      toast(`Failed to delete notebook: ${error.message}`, {error: true});
    }
  }

  if (loadError) {
    return (
      <div className={cn("empty")}>
        <p>Failed to load notebooks.</p>
        <Button onClick={() => setReloadKey((key) => key + 1)}>Retry</Button>
      </div>
    );
  }

  if (notebooks === null) {
    return (
      <div className={cn("empty")}>
        <p className={cn("status")}>Loading…</p>
      </div>
    );
  }

  if (notebooks.length === 0) {
    return (
      <div className={cn("empty")}>
        <p>{user ? "No notebooks found." : "Log in to see your notebooks."}</p>
        {user ? (
          <Button as={Link} variant="primary" href="/">
            New
          </Button>
        ) : (
          <Button variant="primary" onClick={ensureUser}>
            Log in
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className={cn("page wide")}>
      <div className={cn("ex-head")}>
        <h1 className={cn("page-title")}>Your notebooks</h1>
        <span className={cn("status")}>
          {notebooks.length} notebook{notebooks.length === 1 ? "" : "s"}
        </span>
      </div>
      <ul className={cn("card-grid")}>
        {notebooks.map((notebook) => (
          <li key={notebook.id}>
            <Card
              href={`/works/${notebook.id}`}
              title={notebook.title}
              subtitle={`${notebook.visibility === PUBLIC ? "Public" : "Private"} · Created ${new Date(notebook.created).toLocaleDateString()}`}
              thumbnail={
                <ThumbnailClient
                  code={notebook.content}
                  lang={highlightLanguage(notebook.runtime)}
                  outputStartLine={findFirstOutputRange(notebook.content).startLine}
                />
              }
              actions={
                user && (
                  <Button variant="ghost" size="sm" icon tip="Delete notebook" onClick={() => onDelete(notebook.id)}>
                    <Trash2 className={cn("ic")} size={14} strokeWidth={1.75} aria-hidden="true" />
                  </Button>
                )
              }
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
