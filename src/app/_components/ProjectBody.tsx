"use client";

import { memo, useLayoutEffect, useMemo, useRef } from "react";

// A project's write-up. Its pictures are laid out against the page rather than whatever holds
// them (a paragraph, or a paragraph inside an indented list item): on wide screens they centre
// on the text column, on phones they span the screen edge to edge. The CSS can't know how far
// in a picture's container sits, so this measures it and hands it over as custom properties:
//   --shift      how far the container's centre is right of the text column's centre
//   --bleed-l    how far the container's left edge is from the screen's (the quadrant's) edge
//   --bleed-w    the screen's (the quadrant's) width
//   --col-w      the text column's width, which a {N} size is a share of
// Memoised, with a stable __html object: React 19 rewrites dangerouslySetInnerHTML whenever it
// gets a new object, which would wipe the measured properties on every re-render of Surface.
export default memo(function ProjectBody({ html }: { html: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const inner = useMemo(() => ({ __html: html }), [html]);

  useLayoutEffect(() => {
    const body = ref.current;
    if (!body) return;
    const screen = body.closest("section") ?? document.documentElement;
    const place = () => {
      const col = body.getBoundingClientRect();
      const edge = screen.getBoundingClientRect();
      const colCentre = col.left + col.width / 2;
      for (const img of body.querySelectorAll("img")) {
        const box = img.parentElement?.getBoundingClientRect();
        if (!box) continue;
        img.style.setProperty("--shift", `${box.left + box.width / 2 - colCentre}px`);
        img.style.setProperty("--bleed-l", `${box.left - edge.left}px`);
        img.style.setProperty("--bleed-w", `${edge.width}px`);
        img.style.setProperty("--col-w", `${col.width}px`);
      }
    };
    place();
    const ro = new ResizeObserver(place);
    ro.observe(body);
    ro.observe(screen);
    // the column slides into place when a quadrant opens; measure again once it has
    const article = body.closest("article");
    article?.addEventListener("transitionend", place);
    return () => {
      ro.disconnect();
      article?.removeEventListener("transitionend", place);
    };
  }, [html]);

  return <div ref={ref} className="markdown project-body" dangerouslySetInnerHTML={inner} />;
});
