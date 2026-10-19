"use client";
import {useSyncExternalStore} from "react";
import {useRouter} from "next/navigation";
import {isDirtyStore, countStore} from "./store.js";
import Link from "next/link";

export function SafeLink({href, children, className, onClick, newRuntime, ...props}) {
  const router = useRouter();
  const isDirty = useSyncExternalStore(
    isDirtyStore.subscribe,
    isDirtyStore.getSnapshot,
    isDirtyStore.getServerSnapshot,
  );

  const handleClick = (e) => {
    e.preventDefault();
    if (isDirty) {
      const confirmLeave = window.confirm("Your changes will be lost.");
      if (!confirmLeave) return;
    }
    isDirtyStore.setDirty(false);
    if (href === "/") countStore.increment(newRuntime);
    router.push(href);
    onClick?.();
  };

  return (
    <Link href={href} onClick={handleClick} className={className} {...props}>
      {children}
    </Link>
  );
}
