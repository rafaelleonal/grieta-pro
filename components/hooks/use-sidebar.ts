"use client";
import { useSyncExternalStore } from "react";
const KEY = "elociencia-sidebar-collapsed-v1";
const EVENT = "elociencia-sidebar-change";
let fallback: boolean | undefined;
function read() {
  if (fallback !== undefined) return fallback ?? false;
  try {
    return window.localStorage.getItem(KEY) === "true";
  } catch {
    return fallback ?? false;
  }
}
function subscribe(notify: () => void) {
  const onStorage = () => {
    fallback = undefined;
    notify();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(EVENT, notify);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(EVENT, notify);
  };
}
/** Only a display preference is stored, never account or plan data. */
export function useSidebar() {
  const collapsed = useSyncExternalStore(subscribe, read, () => false);
  function toggle() {
    fallback = !collapsed;
    try {
      window.localStorage.setItem(KEY, String(fallback));
    } catch {
      /* Memory-only fallback. */
    }
    window.dispatchEvent(new Event(EVENT));
  }
  return { collapsed, toggle };
}
