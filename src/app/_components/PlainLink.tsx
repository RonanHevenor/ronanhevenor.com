"use client";

import { usePathname } from "next/navigation";

// The way out to the plain HTML version (/html). Fixed to the bottom of the screen above the
// quadrants, so it never moves however they grow or shrink. It's first in the page, so it's
// also the first thing a keyboard or screen-reader user reaches.
export default function PlainLink() {
  const pathname = usePathname();
  if (pathname.startsWith("/ronan")) return null; // not on the admin pages
  return (
    // A plain <a>, not next/link: /html is bare HTML from route handlers, not a React page, so
    // it needs a full page load.
    // eslint-disable-next-line @next/next/no-html-link-for-pages
    <a
      href="/html"
      className="fixed bottom-3 left-1/2 z-50 -translate-x-1/2 whitespace-nowrap rounded-full bg-black/75 px-4 py-1.5 text-sm text-white underline-offset-4 backdrop-blur-sm hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
    >
      Make this site less pretty (yet more accessible)
    </a>
  );
}
