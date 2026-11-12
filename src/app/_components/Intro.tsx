"use client";

import { usePathname } from "next/navigation";
import { memo, useEffect, useState, useSyncExternalStore } from "react";
import { INTRO_SEEN_COOKIE, INTRO_SEEN_MAX_AGE } from "@/lib/intro";
import { track } from "./Tracker";

// The intro, on a first visit (then a cookie keeps it off for a week; src/lib/intro.ts): a
// black screen; "Click a quadrant to read that section." written
// out, faded, then "Click again to go back." written out (a video rendered with ManimGL,
// 3Blue1Brown's Manim, tools/intro/hint.py: each letter outlined, then filled, left to right;
// a portrait version for phones); the words fade to black; then the black fades away to the
// site. The bottom link (PlainLink) fades in as the writing starts, and stays usable above it.
//
// The video's own end starts the ending (class "intro-ending": words fade to black, a beat,
// the black lifts; globals.css), so a video that starts late is never cut off mid-word. If the
// video won't play (autoplay refused, e.g. Safari in Low Power Mode, or an error), a still of
// both sentences is shown for the video's length instead.
//
// It can't be clicked past. The overlay is server-rendered with its layout inline (LAYOUT
// below), so it's a full black screen from the first frame, even if the stylesheet arrives late
// (dev mode, sometimes Safari). An inline script in <head> (INTRO_GATE, run before first paint)
// hides it entirely for anyone who has asked their system to reduce motion or who has just come
// from the plain version.

// Skipped for reduced motion, and when arriving from the plain version (/html): seen from the
// previous page's address, or from ?from=html on the plain version's links back (in case the
// address isn't passed along), which is then taken out of the address bar.
export const INTRO_GATE = `try{var q=new URLSearchParams(location.search),h=q.get("from")==="html",r=document.referrer;if(h){q.delete("from");var t=q.toString();history.replaceState(history.state,"",location.pathname+(t?"?"+t:"")+location.hash)}if(!h&&r){var u=new URL(r);h=u.origin===location.origin&&(u.pathname==="/html"||u.pathname.indexOf("/html/")===0)}if(h||matchMedia("(prefers-reduced-motion: reduce)").matches){document.documentElement.classList.add("no-intro");var s=document.createElement("style");s.textContent=".intro{display:none!important}";document.head.appendChild(s)}}catch(e){}`;

const LAYOUT = {
  overlay: {
    position: "fixed", inset: 0, zIndex: 60, background: "#000",
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  fill: { position: "absolute", inset: 0 },
} as const;

// Written as raw HTML because React leaves `muted` out of server-rendered markup, and browsers
// only autoplay muted video; this way it starts playing before any JavaScript has loaded.
// Phones held upright get the vertical version; the browser picks a <source> before
// downloading, so each device fetches only its own.
const PHONE = "(orientation: portrait) and (max-width: 820px)";
const VIDEO = `<video autoplay muted playsinline preload="auto" aria-hidden="true" style="position:absolute;inset:0;width:100%;height:100%;object-fit:contain;background:#000"><source src="/intro/hint-vertical.mp4" media="${PHONE}" type="video/mp4"><source src="/intro/hint.mp4" type="video/mp4"></video>`;

// The video's layer, rendered once and never touched again. React 19 compares a
// dangerouslySetInnerHTML object by identity, so a fresh `{ __html }` on each render rewrites the
// HTML, which throws the playing video away and autoplays a new one from the start (the
// finished words cut to black, then the opening redrawn). So: one constant object, fixed props,
// memo; showing the still instead is a class on the parent (globals.css).
const VIDEO_HTML = { __html: VIDEO };
const VideoLayer = memo(function VideoLayer() {
  return <div className="intro-video intro-video-live" style={LAYOUT.fill} dangerouslySetInnerHTML={VIDEO_HTML} />;
});

const VIDEO_MS = 6300; // the videos' length; how long the still stays up instead
const ENDING_MS = 2150; // the ending's fades (globals.css), then the overlay is removed
const LONGEST_MS = 12000; // if the video stalls and never ends, end anyway

// Arriving from the plain version (or with reduced motion): INTRO_GATE has already hidden the
// overlay; this takes it out of the page so the video doesn't load in the background.
const skipped = () => document.documentElement.classList.contains("no-intro");
const noSubscribe = () => () => {};

// Only when the site is opened at its homepage: not on a section, a post, a project, a 404 or
// the admin, and not on coming back to the homepage later in the same load.
export default function Intro() {
  const pathname = usePathname();
  const [startedAt] = useState(pathname);
  return startedAt === "/" ? <IntroOverlay /> : null;
}

function IntroOverlay() {
  const noIntro = useSyncExternalStore(noSubscribe, skipped, () => false);
  const [gone, setGone] = useState(false);
  const [ending, setEnding] = useState(false);
  // the video wouldn't play: show a still of both sentences instead
  const [still, setStill] = useState(false);

  useEffect(() => {
    if (skipped()) return;
    const video = document.querySelector<HTMLVideoElement>(".intro video");
    const end = () => setEnding(true);
    let stillTimer: ReturnType<typeof setTimeout> | undefined;
    // Only when the video really can't play: shown the still for the video's length instead.
    const fallBack = () => {
      if (!video || video.currentTime > 0 || !video.paused) return; // it's playing after all
      setStill((was) => {
        if (!was) stillTimer = setTimeout(end, VIDEO_MS);
        return true;
      });
    };
    // ...and if it starts playing anyway, back to the video, ending when it ends
    const playing = () => {
      clearTimeout(stillTimer);
      setStill(false);
    };
    const mediaError = () => {
      // a <source> failing only matters once there's nothing left to try (on a desktop, the
      // phone source is never tried; that's not a failure)
      if (video && (video.error || video.networkState === HTMLMediaElement.NETWORK_NO_SOURCE)) fallBack();
    };
    // It's playing: they'll know how to use the site from now on, so no intro on later visits
    // (the layout checks this cookie).
    track("intro played");
    document.cookie = `${INTRO_SEEN_COOKIE}=1; Max-Age=${INTRO_SEEN_MAX_AGE}; Path=/; SameSite=Lax`;
    const backstop = setTimeout(end, LONGEST_MS);
    if (video) {
      if (video.ended) end();
      video.addEventListener("ended", end);
      video.addEventListener("playing", playing);
      mediaError();
      video.addEventListener("error", mediaError, true);
      // Helps where autoplay was only deferred. Only a refusal (NotAllowedError) means the
      // still: Safari also rejects play() with AbortError when it races its own autoplay, and
      // the video then plays fine.
      if (video.paused && !video.ended) {
        video.play()?.catch((e: unknown) => {
          if (e instanceof DOMException && e.name === "NotAllowedError") fallBack();
        });
      }
    }
    return () => {
      clearTimeout(backstop);
      clearTimeout(stillTimer);
      video?.removeEventListener("ended", end);
      video?.removeEventListener("playing", playing);
      video?.removeEventListener("error", mediaError, true);
    };
  }, []);

  // once the ending starts, the overlay goes when its fade finishes (onAnimationEnd below), or
  // just after, for browsers that pause animations (background tabs)
  useEffect(() => {
    if (!ending) return;
    const t = setTimeout(() => setGone(true), ENDING_MS + 100);
    return () => clearTimeout(t);
  }, [ending]);

  if (gone || noIntro) return null;

  return (
    <div
      aria-hidden="true"
      className={`intro${ending ? " intro-ending" : ""}${still ? " intro-still" : ""}`}
      style={LAYOUT.overlay}
      onAnimationEnd={(e) => {
        if (ending && e.target === e.currentTarget) setGone(true);
      }}
    >
      <VideoLayer />
      {still && (
        <picture className="intro-video" style={LAYOUT.fill}>
          <source media={PHONE} srcSet="/intro/hint-vertical.png" />
          <img src="/intro/hint.png" alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
        </picture>
      )}
    </div>
  );
}
