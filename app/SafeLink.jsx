"use client";
import {useSyncExternalStore} from "react";
import {useRouter} from "next/navigation";
import {isDirtyStore, countStore} from "./store.js";
import Link from "next/link";
import {confirmDialog} from "../components/Dialog.jsx";

export function SafeLink({href, children, className, onClick, newRuntime, ...props}) {
  const router = useRouter();
  const isDirty = useSyncExternalStore(
    isDirtyStore.subscribe,
    isDirtyStore.getSnapshot,
    isDirtyStore.getServerSnapshot,
  );

  const handleClick = async (e) => {
    e.preventDefault();
    if (isDirty) {
      const leave = await confirmDialog({
        title: "Leave without saving?",
        message: "Your changes to this notebook will be lost.",
        confirmLabel: "Discard changes",
        cancelLabel: "Keep editing",
        danger: true,
      });
      if (!leave) return;
    }
    isDirtyStore.setDirty(false);
    // The wordmark and the New menu start a new notebook.
    if (href === "/" || newRuntime) countStore.increment(newRuntime);
    router.push(href);
    onClick?.();
  };

  return (
    <Link href={href} onClick={handleClick} className={className} {...props}>
      {children}
    </Link>
  );
}
