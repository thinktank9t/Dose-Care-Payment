"use client";

import { useEffect } from "react";
import { useRouter } from "@/i18n/navigation";
import { APPEARANCE_EVENT } from "@/lib/appearance";

/**
 * Theme, contrast and text size are rendered on <html> by the server from
 * cookies. The client router keeps visited and prefetched pages for a few
 * minutes (staleTimes), and each cached copy carries the attributes it was
 * rendered with, so after a change, switching language could bring back the
 * old theme. On any appearance change, refresh once: that clears the router
 * cache and re-renders with the new cookies. It waits for the theme reveal to
 * finish so the refresh never interrupts the animation.
 */
export function AppearanceSync() {
  const router = useRouter();
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const onChange = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => router.refresh(), 700);
    };
    window.addEventListener(APPEARANCE_EVENT, onChange);
    return () => {
      if (timer) clearTimeout(timer);
      window.removeEventListener(APPEARANCE_EVENT, onChange);
    };
  }, [router]);
  return null;
}
