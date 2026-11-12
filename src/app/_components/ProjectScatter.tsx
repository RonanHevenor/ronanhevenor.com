"use client";

import Image from "next/image";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";

// Project thumbnails in the "What I do" quadrant.
//
// The quadrant changes shape a lot: half the screen at rest, wider when hovered,
// a tall narrow strip when the photo quadrant next to it grows to a wide
// photo's aspect, the whole screen when opened. Each time, the thumbnails pick
// the arrangement that lets them be biggest in the space under the text (a row,
// a pyramid of one over two, or a stack), spread into whatever room is left,
// and slide there with the quadrant's own timing, so they jockey for position
// as it changes shape.
//
// One of them is the odd one out, picked at random once per page load along
// with which way it goes: up while the other two go down, or the reverse (in a
// stack: left versus right).

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
  base: number; // preferred width, in vw (capped by `cap` vh); shrunk further if it doesn't fit
  cap: number;
  radius?: number; // corner radius as a fraction of the width, so it scales with the thumbnail
  labelScale?: number; // label size relative to the others
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
    // the site's wordmark in the paper's red, #D6001C; a long, light wordmark, so set larger
    labelScale: 1.5,
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

const SCALE: Record<ScatterPhase, number> = { idle: 1, shrunk: 0.9, hover: 1.12, expanded: 1.9 };
// Extra width allowance when open, for narrow (portrait) screens; on wide screens the vh cap wins anyway.
const VW_BOOST: Record<ScatterPhase, number> = { idle: 1, shrunk: 1, hover: 1, expanded: 1.7 };
// Label size: [min px, % of screen width, max px].
const LABEL: Record<ScatterPhase, [number, number, number]> = {
  idle: [8, 1, 17],
  shrunk: [7, 0.9, 15],
  hover: [9, 1.1, 18],
  expanded: [15, 1.7, 28],
};
// How far the odd one out and the pair may split apart, as a fraction of the quadrant's height
// (or width, in a stack); limited further by the room actually left over.
const SPLIT: Record<ScatterPhase, number> = { idle: 0.03, shrunk: 0.02, hover: 0.07, expanded: 0.15 };

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

// "50%" or "calc(100% - (55%))" (the forms Surface's boxes use) as a number of percent.
function percent(s: string): number {
  const m = s.match(/^calc\(100% - \((.+)%\)\)$/);
  return m ? 100 - parseFloat(m[1]) : parseFloat(s);
}

type Placed = { cx: number; cy: number; w: number }; // centre and width, px within the quadrant
type Arrangement = "row" | "pyramid" | "stack";

function layout(
  W: number, // the quadrant's target size, px
  H: number,
  screenW: number,
  screenH: number,
  textBottom: number, // px from the quadrant's top
  phase: ScatterPhase,
  pattern: Pattern,
): { placed: Placed[]; label: number } {
  const s = SCALE[phase];
  const [lMin, lVw, lMax] = LABEL[phase];
  const label = Math.min(lMax, Math.max(lMin, (lVw * screenW) / 100));
  const gap = Math.max(12, 0.035 * Math.min(W, H));
  const pad = 24; // matches the text's px-6
  const region = {
    left: pad,
    top: textBottom + gap,
    width: Math.max(0, W - 2 * pad),
    height: Math.max(0, H - textBottom - gap - Math.max(pad, 0.06 * H)),
  };

  // preferred widths; everything is scaled down together by `f` until it fits
  const want = PROJECTS.map((p) =>
    Math.min((p.base * s * VW_BOOST[phase] * screenW) / 100, (p.cap * s * screenH) / 100),
  );
  const heightOf = (i: number, w: number) => {
    const p = PROJECTS[i];
    const l = label * (p.labelScale ?? 1);
    return (w * p.h) / p.w + 0.6 * l + l; // image, gap, label
  };
  const odd = pattern.odd;
  const pair = [0, 1, 2].filter((i) => i !== odd);

  const bounds = (a: Arrangement, f: number) => {
    const w = want.map((x) => x * f);
    const h = w.map((x, i) => heightOf(i, x));
    if (a === "row") return { w: w[0] + w[1] + w[2] + 2 * gap, h: Math.max(...h) };
    if (a === "stack") return { w: Math.max(...w), h: h[0] + h[1] + h[2] + 2 * gap };
    return {
      w: Math.max(w[odd], w[pair[0]] + w[pair[1]] + gap),
      h: h[odd] + Math.max(h[pair[0]], h[pair[1]]) + gap,
    };
  };
  // largest scale at which an arrangement fills (most of) the space under the text; the
  // preferred widths only set the proportions and a sensible ceiling
  const FILL = 0.9;
  const MAX_F = 2.6;
  const fit = (a: Arrangement) => {
    let lo = 0.2, hi = MAX_F;
    const ok = (f: number) => {
      const b = bounds(a, f);
      return b.w <= region.width * FILL && b.h <= region.height * FILL;
    };
    if (ok(hi)) return hi;
    for (let k = 0; k < 24; k++) { const m = (lo + hi) / 2; if (ok(m)) lo = m; else hi = m; }
    return lo;
  };
  // biggest wins; near-ties go to the row, then the pyramid (the row is the resting look)
  const order: Arrangement[] = ["row", "pyramid", "stack"];
  const scores = order.map(fit);
  const best = Math.max(...scores);
  const pick = order.find((_, k) => scores[k] >= best * 0.97)!;
  const f = scores[order.indexOf(pick)];

  const w = want.map((x) => x * f);
  const h = w.map((x, i) => heightOf(i, x));
  const b = bounds(pick, f);
  const slackX = Math.max(0, region.width - b.w);
  const slackY = Math.max(0, region.height - b.h);
  const midX = region.left + region.width / 2;
  const midY = region.top + region.height / 2;
  const dir = (i: number) => ((i === odd) === pattern.oddGoesUp ? -1 : 1); // -1: up (or left)
  const placed: Placed[] = [];

  if (pick === "row") {
    // spread across half the spare width, split up/down within the spare height
    const g = gap + slackX / 4;
    let x = midX - (b.w + slackX / 2) / 2;
    const split = Math.min(slackY / 2, SPLIT[phase] * H);
    for (let i = 0; i < 3; i++) {
      placed[i] = { cx: x + w[i] / 2, cy: midY + dir(i) * split, w: w[i] };
      x += w[i] + g;
    }
  } else if (pick === "stack") {
    // spread down half the spare height, zig-zag left/right within the spare width
    const g = gap + slackY / 4;
    let y = midY - (b.h + slackY / 2) / 2;
    const zig = Math.min(slackX / 2, SPLIT[phase] * W * 1.5);
    for (let i = 0; i < 3; i++) {
      placed[i] = { cx: midX + dir(i) * zig, cy: y + h[i] / 2, w: w[i] };
      y += h[i] + g;
    }
  } else {
    // the odd one alone on one row (top if it goes up), the pair side by side on the other
    const rowGap = gap + slackY / 2;
    const pairH = Math.max(h[pair[0]], h[pair[1]]);
    const top = midY - (b.h + slackY / 2) / 2;
    const oddFirst = pattern.oddGoesUp;
    const oddCy = oddFirst ? top + h[odd] / 2 : top + pairH + rowGap + h[odd] / 2;
    const pairCy = oddFirst ? top + h[odd] + rowGap + pairH / 2 : top + pairH / 2;
    const pg = gap + slackX / 2;
    const pairW = w[pair[0]] + w[pair[1]] + pg;
    placed[odd] = { cx: midX, cy: oddCy, w: w[odd] };
    placed[pair[0]] = { cx: midX - pairW / 2 + w[pair[0]] / 2, cy: pairCy, w: w[pair[0]] };
    placed[pair[1]] = { cx: midX + pairW / 2 - w[pair[1]] / 2, cy: pairCy, w: w[pair[1]] };
  }
  return { placed, label };
}

type Measure = { screenW: number; screenH: number; textBottom: number };

export default function ProjectScatter({
  phase,
  timing,
  hidden,
  fadeStyle,
  box,
}: {
  phase: ScatterPhase;
  timing: string; // e.g. "750ms cubic-bezier(0, 0, 0.2, 1)", the quadrant's own
  hidden: boolean; // another quadrant is open: fade out with the text
  fadeStyle: React.CSSProperties;
  box: { width: string; height: string }; // the quadrant's target size, as Surface sets it
}) {
  const pattern = useSyncExternalStore(subscribe, getPattern, () => SERVER_PATTERN);
  const rootRef = useRef<HTMLDivElement>(null);
  const [m, setM] = useState<Measure | null>(null);

  // Watch the surface's size and how far down the quadrant's text reaches.
  useEffect(() => {
    const section = rootRef.current?.parentElement;
    const main = section?.parentElement;
    if (!section || !main) return;
    const text = section.querySelector(".markdown");
    const read = () => {
      const st = section.getBoundingClientRect().top;
      const tb = text ? text.getBoundingClientRect().bottom - st : 120;
      setM((prev) => {
        const next = { screenW: main.clientWidth, screenH: main.clientHeight, textBottom: Math.round(tb) };
        return prev && prev.screenW === next.screenW && prev.screenH === next.screenH && prev.textBottom === next.textBottom
          ? prev
          : next;
      });
    };
    const ro = new ResizeObserver(read);
    ro.observe(main);
    if (text) ro.observe(text);
    read();
    return () => ro.disconnect();
  }, []);

  let result: { placed: Placed[]; label: number } | null = null;
  if (m) {
    // Lay out for where the quadrant is going, not where it is mid-animation. While another
    // quadrant is open this one is shrinking to nothing (and faded out): keep the resting layout.
    const W = hidden ? m.screenW / 2 : (percent(box.width) / 100) * m.screenW;
    const H = hidden ? m.screenH / 2 : (percent(box.height) / 100) * m.screenH;
    result = layout(W, H, m.screenW, m.screenH, m.textBottom, hidden ? "idle" : phase, pattern);
  }
  const move = `left ${timing}, top ${timing}, width ${timing}`;

  return (
    <div
      ref={rootRef}
      aria-hidden={hidden}
      className="pointer-events-none absolute inset-0 z-10"
      // hidden (not faded) until the first measurement, so nothing has to animate in from 0
      style={{ ...fadeStyle, ...(result ? null : { visibility: "hidden" }) }}
    >
      {result &&
        PROJECTS.map((p, i) => {
          const { cx, cy, w } = result.placed[i];
          const l = result.label * (p.labelScale ?? 1);
          return (
            <figure
              key={p.title}
              className="absolute m-0 flex flex-col items-center"
              style={{
                left: cx,
                top: cy,
                width: w,
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
                    ? { borderRadius: w * p.radius, transition: `border-radius ${timing}` }
                    : undefined
                }
              />
              <figcaption
                className="flex items-center justify-center whitespace-nowrap leading-none"
                style={{
                  marginTop: 0.6 * l,
                  height: l,
                  fontSize: l,
                  transition: `height ${timing}, font-size ${timing}, margin-top ${timing}`,
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
