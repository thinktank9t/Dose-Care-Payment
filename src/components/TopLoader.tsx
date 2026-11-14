"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

const SHOW_AFTER_MS = 120; // instant (cached) navigations finish before this, so no flash
const GIVE_UP_MS = 12000; // never leave a bar stuck if a navigation is abandoned

/**
 * Thin accent progress bar across the top of the window during page changes.
 * The App Router has no navigation events, so: a click on an in-app link that
 * goes somewhere else starts it, and the URL actually changing finishes it.
 * The click is caught in the capture phase, because Next's <Link> cancels the
 * native navigation (to route on the client) before a bubbling listener runs.
 * A link that sometimes does something other than navigate (e.g. opens a
 * sheet instead) opts out with data-no-loader.
 * It eases toward 90% while waiting, then completes and fades. Only transform
 * and opacity animate (compositor-only).
 */
export function TopLoader() {
  const pathname = usePathname();
  const search = useSearchParams();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const loading = useRef(false);
  const timers = useRef<number[]>([]);
  const trickle = useRef<number | null>(null);

  const clearAll = () => {
    timers.current.forEach((id) => window.clearTimeout(id));
    timers.current = [];
    if (trickle.current !== null) window.clearInterval(trickle.current);
    trickle.current = null;
  };

  // Finish whenever the URL changes (the new page is on screen).
  const routeKey = `${pathname}?${search.toString()}`;
  useEffect(() => {
    if (!loading.current) return;
    loading.current = false;
    clearAll();
    setProgress(1);
    timers.current.push(
      window.setTimeout(() => setVisible(false), 220),
      window.setTimeout(() => setProgress(0), 520),
    );
  }, [routeKey]);

  useEffect(() => {
    const start = () => {
      clearAll();
      loading.current = true;
      setProgress(0.08);
      timers.current.push(
        window.setTimeout(() => {
          if (!loading.current) return;
          setVisible(true);
          trickle.current = window.setInterval(() => {
            setProgress((value) => value + (0.9 - value) * 0.12);
          }, 260);
        }, SHOW_AFTER_MS),
        window.setTimeout(() => {
          if (!loading.current) return;
          loading.current = false;
          clearAll();
          setVisible(false);
          setProgress(0);
        }, GIVE_UP_MS),
      );
    };

    const onClick = (event: MouseEvent) => {
      if (event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as Element | null)?.closest?.("a");
      if (!anchor || !anchor.href) return;
      if (anchor.closest("[data-no-loader]")) return;
      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.hasAttribute("download")) return;
      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      // Same page, or only the #hash changes: nothing to load.
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      start();
    };

    document.addEventListener("click", onClick, true);
    return () => {
      document.removeEventListener("click", onClick, true);
      clearAll();
    };
  }, []);

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-[3px]"
      style={{ opacity: visible ? 1 : 0, transition: "opacity 300ms ease" }}
    >
      <div
        className="h-full origin-left bg-accent shadow-[0_0_10px_var(--accent),0_0_4px_var(--accent)]"
        style={{ transform: `scaleX(${progress})`, transition: "transform 240ms ease-out" }}
      />
    </div>
  );
}
