"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

// The intro, on every load: a black screen; "Click a quadrant to read that section" written
// out (a video rendered with ManimGL, 3Blue1Brown's Manim, tools/intro/hint.py: each letter
// outlined, then filled, left to right); it fades; the black fades away to the site. The
// bottom link (PlainLink) fades in as the writing starts, and stays usable above it.
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
const VIDEO = `<video src="/intro/hint.mp4" autoplay muted playsinline preload="auto" aria-hidden="true" style="position:absolute;inset:0;width:100%;height:100%;object-fit:contain;background:#000"></video>`;

// Just after the timeline ends (6.5 s, globals.css).
const DONE_MS = 6600;

export default function Intro() {
  const pathname = usePathname();
  const [gone, setGone] = useState(false);

  // The overlay normally removes itself when its fade-out ends (onAnimationEnd below); this is
  // the backstop for browsers that pause animations (background tabs).
  useEffect(() => {
    const done = setTimeout(() => setGone(true), DONE_MS);
    return () => clearTimeout(done);
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
      <div className="intro-video" style={LAYOUT.fill} dangerouslySetInnerHTML={{ __html: VIDEO }} />
    </div>
  );
}
