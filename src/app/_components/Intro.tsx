"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

// The intro, on every load: a black screen; "Click a quadrant to read that section" written
// out (a video rendered with ManimGL, 3Blue1Brown's Manim, tools/intro/hint.py: each letter
// outlined, then filled, left to right; on phones one word per line, top to bottom); the words
// fade to black; then the black fades away to the site. The bottom link (PlainLink) fades in as
// the writing starts, and stays usable above it.
//
// It can't be clicked past. The timing is CSS (globals.css, "Intro") and the overlay is
// server-rendered, so it starts on the first frame with no flash of the site underneath. Its
// layout is also set inline (LAYOUT below): if the page paints before the stylesheet arrives
// (dev mode, sometimes Safari) it's still a full black screen with the video centred, not a
// video in the corner of the page. An inline script in <head> (INTRO_GATE, run before first
// paint) hides it entirely for anyone who has asked their system to reduce motion.

export const INTRO_GATE = `try{if(matchMedia("(prefers-reduced-motion: reduce)").matches){document.documentElement.classList.add("no-intro");var s=document.createElement("style");s.textContent=".intro{display:none!important}";document.head.appendChild(s)}}catch(e){}`;

const LAYOUT = {
  overlay: {
    position: "fixed", inset: 0, zIndex: 60, background: "#000",
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  fill: { position: "absolute", inset: 0 },
} as const;

// Written as raw HTML because React leaves `muted` out of server-rendered markup, and browsers
// only autoplay muted video; this way it starts playing before any JavaScript has loaded.
// Phones held upright get the vertical version (two lines, portrait); the browser picks a
// <source> before downloading, so each device fetches only its own.
const PHONE = "(orientation: portrait) and (max-width: 820px)";
const VIDEO = `<video autoplay muted playsinline preload="auto" aria-hidden="true" style="position:absolute;inset:0;width:100%;height:100%;object-fit:contain;background:#000"><source src="/intro/hint-vertical.mp4" media="${PHONE}" type="video/mp4"><source src="/intro/hint.mp4" type="video/mp4"></video>`;

// Just after the timeline ends (6.0 s, globals.css).
const DONE_MS = 6100;

export default function Intro() {
  const pathname = usePathname();
  const [gone, setGone] = useState(false);
  // the video wouldn't play (autoplay refused, e.g. Safari in Low Power Mode, or an error):
  // show a still of the finished words instead, with the same fades
  // (when, in seconds since the page started, so its fade can keep to the same timeline)
  const [still, setStill] = useState<number | null>(null);

  useEffect(() => {
    // The overlay normally removes itself when its fade-out ends (onAnimationEnd below); this is
    // the backstop for browsers that pause animations (background tabs).
    const done = setTimeout(() => setGone(true), DONE_MS);

    // Ask it to play (helps where autoplay was only deferred) and fall back to the still if the
    // browser refuses or the file can't be played.
    const video = document.querySelector<HTMLVideoElement>(".intro video");
    const fallBack = () => setStill((t) => t ?? performance.now() / 1000);
    if (video) {
      if (video.error) fallBack();
      video.addEventListener("error", fallBack, true);
      video.querySelectorAll("source").forEach((s) => s.addEventListener("error", fallBack));
      if (video.paused) video.play()?.catch(fallBack);
    }
    return () => {
      clearTimeout(done);
      video?.removeEventListener("error", fallBack, true);
    };
  }, []);

  if (gone || pathname.startsWith("/ronan")) return null;

  return (
    <div
      aria-hidden="true"
      className="intro"
      style={LAYOUT.overlay}
      onAnimationEnd={(e) => {
        if (e.target === e.currentTarget) setGone(true);
      }}
    >
      <div
        className="intro-video"
        style={{ ...LAYOUT.fill, ...(still !== null ? { visibility: "hidden" } : null) }}
        dangerouslySetInnerHTML={{ __html: VIDEO }}
      />
      {still !== null && (
        // fades at 4.0 s after the page started, like the video (an animation added later counts
        // from when it's added, so its delay is shortened by how late it arrived)
        <picture
          style={{ ...LAYOUT.fill, animation: `intro-out 0.8s ease-in-out ${Math.max(0, 4 - still)}s forwards` }}
        >
          <source media={PHONE} srcSet="/intro/hint-vertical.png" />
          <img src="/intro/hint.png" alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
        </picture>
      )}
    </div>
  );
}
