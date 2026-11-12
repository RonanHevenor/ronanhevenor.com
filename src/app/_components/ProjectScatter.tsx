"use client";

import Image from "next/image";
import { useSyncExternalStore } from "react";

// Project thumbnails in the "What I do" quadrant. They sit in a loose row when
// the quadrant is at rest and scatter outward as it grows: one goes up and the
// other two go down, or the other way round. Which one breaks away, and which
// way, is picked at random once per page load.
//
// Positions are percentages of the quadrant, so the thumbnails already ride
// along with its own grow/shrink; on top of that each phase has its own
// targets, animated with the same timing as the quadrant.

export type ScatterPhase = "idle" | "hover" | "shrunk" | "expanded";

// Each label is set in the project's own type: an image of its wordmark, or text styled like it.
type Label =
  | { kind: "image"; src: string; w: number; h: number }
  | { kind: "text"; text: string; style: React.CSSProperties };

type Project = {
  title: string; // for alt text
  src: string;
  w: number; // intrinsic size, for the aspect ratio
  h: number;
  base: number; // width at rest, in vw (capped by `cap` vh)
  cap: number;
  radius?: number; // corner radius as a fraction of the width, so it scales with the thumbnail
  label: Label;
};

const PROJECTS: Project[] = [
  {
    title: "Typeset",
    src: "/projects/typeset.png", w: 512, h: 512, base: 7, cap: 11.5,
    // "Typeset" in SF Pro Black filled with the app icon's rainbow
    label: { kind: "image", src: "/projects/typeset-wordmark.png", w: 1548, h: 360 },
  },
  {
    title: "poly.rpi.edu",
    src: "/projects/poly-site.png", w: 2880, h: 1920, base: 13.5, cap: 22, radius: 0.055,
    // the site's wordmark in the paper's red, #D6001C
    label: { kind: "image", src: "/projects/poly-rpi-edu.svg", w: 1121, h: 200 },
  },
  {
    title: "Sentinel",
    src: "/projects/sentinel-leds.jpg", w: 640, h: 480, base: 9.5, cap: 15.5, radius: 0.055,
    // the Sentinel dashboard's header: light weight, capitals, letter-spacing 4px at 32px
    label: {
      kind: "text",
      text: "SENTINEL",
      style: {
        fontFamily: "'Segoe UI', system-ui, sans-serif",
        fontWeight: 300,
        letterSpacing: "0.125em",
        marginRight: "-0.125em", // the spacing after the last letter shouldn't push it off centre
      },
    },
  },
];

// Horizontal centres (% of the quadrant) and size multiplier per phase.
const X: Record<ScatterPhase, number[]> = {
  idle: [22, 50, 78],
  shrunk: [24, 50, 76],
  hover: [19, 50, 81],
  expanded: [17, 50, 83],
};
const SCALE: Record<ScatterPhase, number> = { idle: 1, shrunk: 0.9, hover: 1.12, expanded: 1.9 };
// Extra width allowance when open, for narrow (portrait) screens; on wide screens the vh cap wins anyway.
const VW_BOOST: Record<ScatterPhase, number> = { idle: 1, shrunk: 1, hover: 1, expanded: 1.7 };
// Label height (wordmark images) and font size (text labels); scales with the screen so labels
// don't collide on phones.
const LABEL: Record<ScatterPhase, string> = {
  idle: "clamp(0.5rem, 1vw, 1.05rem)",
  shrunk: "clamp(0.45rem, 0.9vw, 0.95rem)",
  hover: "clamp(0.55rem, 1.1vw, 1.15rem)",
  expanded: "clamp(0.95rem, 1.7vw, 1.75rem)",
};
// Vertical centre for the row, and how far the odd one out and the pair split apart from it.
const Y_MID: Record<ScatterPhase, number> = { idle: 64, shrunk: 64, hover: 63, expanded: 56 };
const Y_SPLIT: Record<ScatterPhase, number> = { idle: 3, shrunk: 2, hover: 7, expanded: 15 };

type Pattern = { odd: number; oddGoesUp: boolean };

// Random, but stable for the life of the page, and a fixed value during server
// render so hydration matches (React swaps in the client value right after).
const SERVER_PATTERN: Pattern = { odd: 1, oddGoesUp: true };
let clientPattern: Pattern | null = null;
function getPattern(): Pattern {
  if (!clientPattern) {
    clientPattern = {
      odd: Math.floor(Math.random() * PROJECTS.length),
      oddGoesUp: Math.random() < 0.5,
    };
  }
  return clientPattern;
}
const subscribe = () => () => {};

// The thumbnail's width for a phase (times `k`, e.g. for a corner radius in proportion to it).
function widthOf(p: Project, phase: ScatterPhase, k = 1): string {
  const s = SCALE[phase];
  return `min(${p.base * s * VW_BOOST[phase] * k}vw, ${p.cap * s * k}vh)`;
}

export default function ProjectScatter({
  phase,
  timing,
  hidden,
  fadeStyle,
}: {
  phase: ScatterPhase;
  timing: string; // e.g. "750ms cubic-bezier(0, 0, 0.2, 1)", the quadrant's own
  hidden: boolean; // another quadrant is open: fade out with the text
  fadeStyle: React.CSSProperties;
}) {
  const pattern = useSyncExternalStore(subscribe, getPattern, () => SERVER_PATTERN);
  const move =`left ${timing}, top ${timing}, width ${timing}`;

  return (
    <div
      aria-hidden={hidden}
      className="pointer-events-none absolute inset-0 z-10"
      style={fadeStyle}
    >
      {PROJECTS.map((p, i) => {
        const isOdd = i === pattern.odd;
        const up = isOdd === pattern.oddGoesUp;
        const y = Y_MID[phase] + (up ? -1 : 1) * Y_SPLIT[phase];
        return (
          <figure
            key={p.title}
            className="absolute m-0 flex flex-col items-center"
            style={{
              left: `${X[phase][i]}%`,
              top: `${y}%`,
              width: widthOf(p, phase),
              transform: "translate(-50%, -50%)",
              transition: move,
            }}
          >
            <Image
              src={p.src}
              alt=""
              width={p.w}
              height={p.h}
              sizes={`${Math.ceil(p.base * SCALE.expanded * VW_BOOST.expanded)}vw`}
              className="h-auto w-full"
              style={
                p.radius
                  ? { borderRadius: widthOf(p, phase, p.radius), transition: `border-radius ${timing}` }
                  : undefined
              }
            />
            <figcaption
              className="mt-[0.6em] flex items-center justify-center whitespace-nowrap leading-none"
              style={{
                height: LABEL[phase],
                fontSize: LABEL[phase],
                transition: `height ${timing}, font-size ${timing}`,
              }}
            >
              {p.label.kind === "image" ? (
                <Image
                  src={p.label.src}
                  alt={p.title}
                  width={p.label.w}
                  height={p.label.h}
                  unoptimized // small wordmarks (one is an SVG); serve as-is
                  className="h-full w-auto max-w-none"
                />
              ) : (
                <span style={p.label.style}>{p.label.text}</span>
              )}
            </figcaption>
          </figure>
        );
      })}
    </div>
  );
}
