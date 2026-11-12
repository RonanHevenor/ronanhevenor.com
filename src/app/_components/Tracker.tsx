"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

// Reports page views to the site's own counter (/a). See src/lib/analytics.ts for the rules:
// nothing is stored on the device, nothing identifies the visitor, nothing about the device is
// read. What's sent: the page's path, the referring site (first page only), how many pages
// this load has shown, and, when the page is left, how long it was in view.

// This page load's tally. It lives in memory only and is gone when the page is.
const visit = { pages: 0, trail: [] as string[], shownAt: 0, seconds: 0 };

function send(body: Record<string, unknown>) {
  try {
    const data = JSON.stringify(body);
    if (!navigator.sendBeacon?.("/a", data)) {
      void fetch("/a", { method: "POST", body: data, keepalive: true });
    }
  } catch {
    // never in the way of the page
  }
}

// For other components: something happened worth counting (e.g. the intro played).
export function track(e: string, x?: string) {
  send({ k: "event", p: location.pathname, e, x });
}

export default function Tracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname.startsWith("/ronan")) return;
    visit.pages++;
    if (visit.trail.length < 8) visit.trail.push(pathname);
    send({ k: "view", p: pathname, n: visit.pages, ...(visit.pages === 1 ? { r: document.referrer } : {}) });
  }, [pathname]);

  useEffect(() => {
    visit.shownAt = document.visibilityState === "visible" ? performance.now() : 0;
    const onVisibility = () => {
      if (document.visibilityState === "visible") visit.shownAt = performance.now();
      else if (visit.shownAt) { visit.seconds += (performance.now() - visit.shownAt) / 1000; visit.shownAt = 0; }
    };
    // one summary of the visit, when the page is closed or left
    const onLeave = () => {
      if (!visit.pages) return;
      if (visit.shownAt) { visit.seconds += (performance.now() - visit.shownAt) / 1000; visit.shownAt = 0; }
      send({ k: "leave", p: visit.trail[0], s: visit.seconds, j: visit.pages, x: visit.trail.join(" → ") });
    };
    // links that lead off the site
    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (a && a.host && a.host !== location.host && /^https?:$/.test(a.protocol)) track("outbound", a.host + a.pathname.replace(/\/$/, ""));
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onLeave);
    document.addEventListener("click", onClick, true);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onLeave);
      document.removeEventListener("click", onClick, true);
    };
  }, []);

  return null;
}
