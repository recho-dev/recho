"use client";
import {useState, useEffect, useSyncExternalStore} from "react";
import Link from "next/link";
import {Trash} from "lucide-react";
import {ThumbnailClient} from "../ThumbnailClient.js";
import {getNotebooks, deleteNotebook} from "../api.js";
import {authStore, ensureUser} from "../auth.js";
import {findFirstOutputRange} from "../shared.js";
import {cn} from "../cn.js";

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
      alert(`Failed to delete notebook: ${error.message}`);
    }
  }

  const buttonClassName = cn("mt-4", "inline-block bg-black text-white rounded-md px-3 py-1 text-sm hover:bg-gray-800");

  if (loadError) {
    return (
      <div className={cn("text-center mt-20")}>
        <p className={cn("mt-4")}>Failed to load notebooks.</p>
        <button onClick={() => setReloadKey((key) => key + 1)} className={buttonClassName}>
          Retry
        </button>
      </div>
    );
  }

  if (notebooks === null) {
    return <div className={cn("text-center mt-20")}>Loading...</div>;
  }

  if (notebooks.length === 0) {
    return (
      <div className={cn("text-center mt-20")}>
        <p className={cn("mt-4")}>{user ? "No notebooks found." : "Log in to see your notebooks."}</p>
        {user ? (
          <Link href="/" className={buttonClassName}>
            New
          </Link>
        ) : (
          <button onClick={ensureUser} className={buttonClassName}>
            Log in
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={cn("max-w-screen-xl lg:mx-auto mx-4 my-4")}>
      <div className={cn("grid gap-12 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 mt-10")}>
        {notebooks.map((notebook) => (
          <div key={notebook.id}>
            <div className={cn("flex items-center justify-between mb-3")}>
              <div className={cn("flex-1 min-w-0")}>
                <Link
                  href={`/works/${notebook.id}`}
                  className={cn("font-semibold hover:underline text-blue-500 block truncate")}
                >
                  <span>{notebook.title}</span>
                </Link>
                <div className={cn("text-sm text-gray-500")}>
                  Created {new Date(notebook.created).toLocaleDateString()}
                </div>
              </div>
              {user && (
                <button
                  onClick={() => onDelete(notebook.id)}
                  className={cn("hover:scale-110 transition-transform duration-100 ml-2 flex-shrink-0")}
                >
                  <Trash className={cn("w-4 h-4")} />
                </button>
              )}
            </div>
            <div className={cn("w-full pt-[62.5%] relative border border-gray-200 rounded-md overflow-hidden")}>
              <div className={cn("absolute inset-0 px-3")}>
                <ThumbnailClient
                  code={notebook.content}
                  outputStartLine={findFirstOutputRange(notebook.content).startLine}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
