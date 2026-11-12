"use client";

import Image from "next/image";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { PROJECTS, type Project } from "@/lib/projects";

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
// At rest they lie like prints tossed on a table: each a few degrees off true
// and nudged off its spot. As the quadrant opens they straighten, spread into
// the extra room, moving in step with the quadrant itself (same duration and
// curve, no delay). The tilts and nudges are random, picked once per page load.

export type ScatterPhase = "idle" | "hover" | "shrunk" | "expanded";


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
// How tilted they lie (times each one's random tilt of up to ±MAX_TILT degrees): most askew when
// squeezed, nearly straight when open.
const MAX_TILT = 4;
const TILT: Record<ScatterPhase, number> = { idle: 1, shrunk: 1.2, hover: 0.55, expanded: 0.12 };
// How far each may wander off its spot, as a share of the room left over around it.
const NUDGE: Record<ScatterPhase, number> = { idle: 0.5, shrunk: 0.35, hover: 0.7, expanded: 0.9 };

type Pattern = {
  lone: number; // in a pyramid, the one on a row of its own
  loneOnTop: boolean;
  nudge: { x: number; y: number }[]; // each in -1..1
  tilt: number[]; // each in -1..1
};

// Random, but stable for the life of the page, and a fixed value during server
// render so hydration matches (React swaps in the client value right after).
const SERVER_PATTERN: Pattern = {
  lone: 1,
  loneOnTop: true,
  nudge: [{ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 }],
  tilt: [0, 0, 0],
};
let clientPattern: Pattern | null = null;
function getPattern(): Pattern {
  if (!clientPattern) {
    const r = () => Math.random() * 2 - 1;
    // tilts alternate in sign so they never all lean the same way
    const lean = Math.random() < 0.5 ? 1 : -1;
    clientPattern = {
      lone: Math.floor(Math.random() * PROJECTS.length),
      loneOnTop: Math.random() < 0.5,
      nudge: PROJECTS.map(() => ({ x: r(), y: r() })),
      tilt: PROJECTS.map((_, i) => (i % 2 ? -lean : lean) * (0.45 + 0.55 * Math.random())),
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

// Tilt each thumbnail and nudge it off its spot by its random amount, within the room it has
// (roomX/roomY: how far it can go each way without reaching a neighbour or the edge).
function nudgeAll(
  placed: Placed[],
  pattern: Pattern,
  phase: ScatterPhase,
  roomX: (i: number) => number,
  roomY: (i: number) => number,
) {
  const k = NUDGE[phase];
  placed.forEach((p, i) => {
    p.cx += pattern.nudge[i].x * Math.max(0, roomX(i)) * k;
    p.cy += pattern.nudge[i].y * Math.max(0, roomY(i)) * k;
    p.tilt = pattern.tilt[i] * MAX_TILT * TILT[phase];
  });
}

// Space between an image and its label; pulled up by any transparent margin under the image,
// so every label sits the same distance from what you actually see.
function labelGap(p: Project, w: number, l: number): number {
  return p.inset ? 0.4 * l - p.inset * w : 0.6 * l;
}

// centre and width (px within the quadrant), tilt (degrees)
type Placed = { cx: number; cy: number; w: number; tilt: number };
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
  const labelWidth = (i: number) => {
    const p = PROJECTS[i];
    const l = label * (p.labelScale ?? 1);
    return p.label.kind === "image" ? (l * p.label.w) / p.label.h : l * 0.78 * p.label.text.length;
  };
  // how much room an item takes across: its image or its label, whichever is wider
  const spanOf = (i: number, w: number) => Math.max(w, labelWidth(i));
  const heightOf = (i: number, w: number) => {
    const p = PROJECTS[i];
    const l = label * (p.labelScale ?? 1);
    return (w * p.h) / p.w + labelGap(p, w, l) + l; // image, gap, label
  };
  const odd = pattern.lone;
  const pair = [0, 1, 2].filter((i) => i !== odd);

  const bounds = (a: Arrangement, f: number) => {
    const w = want.map((x, i) => spanOf(i, x * f));
    const h = want.map((x, i) => heightOf(i, x * f));
    if (a === "row") return { w: w[0] + w[1] + w[2] + 2 * gap, h: Math.max(...h) };
    if (a === "stack") return { w: Math.max(...w), h: h[0] + h[1] + h[2] + 2 * gap };
    return {
      w: Math.max(w[odd], w[pair[0]] + w[pair[1]] + gap),
      h: h[odd] + Math.max(h[pair[0]], h[pair[1]]) + gap,
    };
  };
  // largest scale at which an arrangement fills (most of) the space under the text; the
  // preferred widths only set the proportions and a sensible ceiling
  const FILL = 0.84;
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

  const img = want.map((x) => x * f); // image widths
  const w = img.map((x, i) => spanOf(i, x)); // room each takes across
  const h = img.map((x, i) => heightOf(i, x));
  const b = bounds(pick, f);
  const slackX = Math.max(0, region.width - b.w);
  const slackY = Math.max(0, region.height - b.h);
  const midX = region.left + region.width / 2;
  const midY = region.top + region.height / 2;
  const placed: Placed[] = [];

  if (pick === "row") {
    // spread across half the spare width
    const g = gap + slackX / 4;
    let x = midX - (b.w + slackX / 2) / 2;
    for (let i = 0; i < 3; i++) {
      placed[i] = { cx: x + w[i] / 2, cy: midY, w: img[i], tilt: 0 };
      x += w[i] + g;
    }
    nudgeAll(placed, pattern, phase, () => (g - gap) / 2 + gap * 0.25, (i) => (region.height - h[i]) / 2);
  } else if (pick === "stack") {
    // spread down half the spare height
    const g = gap + slackY / 4;
    let y = midY - (b.h + slackY / 2) / 2;
    for (let i = 0; i < 3; i++) {
      placed[i] = { cx: midX, cy: y + h[i] / 2, w: img[i], tilt: 0 };
      y += h[i] + g;
    }
    nudgeAll(placed, pattern, phase, (i) => (region.width - w[i]) / 2, () => (g - gap) / 2 + gap * 0.25);
  } else {
    // the odd one alone on one row (top if it goes up), the pair side by side on the other
    const rowGap = gap + slackY / 2;
    const pairH = Math.max(h[pair[0]], h[pair[1]]);
    const top = midY - (b.h + slackY / 2) / 2;
    const oddFirst = pattern.loneOnTop;
    const oddCy = oddFirst ? top + h[odd] / 2 : top + pairH + rowGap + h[odd] / 2;
    const pairCy = oddFirst ? top + h[odd] + rowGap + pairH / 2 : top + pairH / 2;
    const pg = gap + slackX / 2;
    const pairW = w[pair[0]] + w[pair[1]] + pg;
    placed[odd] = { cx: midX, cy: oddCy, w: img[odd], tilt: 0 };
    placed[pair[0]] = { cx: midX - pairW / 2 + w[pair[0]] / 2, cy: pairCy, w: img[pair[0]], tilt: 0 };
    placed[pair[1]] = { cx: midX + pairW / 2 - w[pair[1]] / 2, cy: pairCy, w: img[pair[1]], tilt: 0 };
    nudgeAll(
      placed, pattern, phase,
      (i) => (i === odd ? (region.width - w[i]) / 2 : (pg - gap) / 2 + gap * 0.25),
      () => (rowGap - gap) / 2 + gap * 0.25,
    );
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
  const move = `left ${timing}, top ${timing}, width ${timing}, transform ${timing}`;

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
          const { cx, cy, w, tilt } = result.placed[i];
          const l = result.label * (p.labelScale ?? 1);
          return (
            <figure
              key={p.title}
              // the layer ignores the mouse (clicks there still open the quadrant); each
              // thumbnail takes it back, and comes to the front while it's hovered
              className="pointer-events-auto absolute m-0 hover:z-20 focus-within:z-20"
              style={{
                left: cx,
                top: cy,
                width: w,
                transform: `translate(-50%, -50%) rotate(${tilt.toFixed(2)}deg)`,
                transition: move,
                ...(hidden ? { pointerEvents: "none" } : null),
              }}
            >
              {/* the whole thumbnail is the link to its GitHub repository, and grows on hover
                  or keyboard focus */}
              <a
                href={`https://github.com/${p.repo}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${p.title} on GitHub (opens in a new tab)`}
                tabIndex={hidden ? -1 : undefined}
                className="flex flex-col items-center rounded-lg outline-offset-8 transition-transform duration-300 ease-out hover:scale-[1.12] focus-visible:scale-[1.12] focus-visible:outline-2 focus-visible:outline-current"
              >
                <Image
                  src={p.src}
                  alt={p.alt}
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
                <div
                  className="flex items-center justify-center whitespace-nowrap leading-none"
                  style={{
                    marginTop: labelGap(p, w, l),
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
                </div>
              </a>
            </figure>
          );
        })}
    </div>
  );
}
