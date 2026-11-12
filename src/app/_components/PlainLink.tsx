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
      className="fixed bottom-3 left-1/2 z-50 inline-flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full bg-black/75 py-1.5 pl-3 pr-4 text-sm text-white underline-offset-4 backdrop-blur-sm hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
    >
      {/* the universal accessibility symbol: a figure, arms out, in a circle (decorative;
          the link's text says what it does) */}
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="h-[1.15em] w-[1.15em] shrink-0"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="10" />
        <circle cx="12" cy="6.6" r="1.5" fill="currentColor" stroke="none" />
        <path d="M6.8 9.4c3.5 1 6.9 1 10.4 0" />
        <path d="M12 10.2v4" />
        <path d="M12 14.2 9.4 18.6" />
        <path d="M12 14.2l2.6 4.4" />
      </svg>
      Make this site less pretty (yet more accessible)
    </a>
  );
}
