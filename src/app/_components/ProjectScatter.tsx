"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { CORNER_RADIUS, SIZE_TO_VH_CAP } from "@/lib/projects";
import type { SurfaceProject } from "./Surface";

// Project thumbnails in the "What I do" quadrant; each links to its project's page.
//
// The quadrant changes shape a lot: half the screen at rest, wider when hovered,
// a tall narrow strip when the photo quadrant next to it grows to a wide
// photo's aspect, the whole screen when opened. Each time, the thumbnails pick
// the number of rows that lets them be biggest in the space under the text (one
// row, two, ... one per row), spread into whatever room is left, and slide there
// with the quadrant's own timing, so they jockey for position as it changes shape.
//
// At rest they lie like prints tossed on a table: each a few degrees off true
// and nudged off its spot. As the quadrant opens they straighten, spread into
// the extra room, moving in step with the quadrant itself (same duration and
// curve, no delay). The tilts and nudges are random, picked once per page load.
//
// Sizes come from each project's settings in the admin: `size` is its preferred
// width relative to the others, `titleSize` its title image's. Corners are
// rounded here, in proportion to each thumbnail's width.

export type ScatterPhase = "idle" | "hover" | "shrunk" | "expanded";

const SCALE: Record<ScatterPhase, number> = { idle: 1, shrunk: 0.9, hover: 1.12, expanded: 1.9 };
// Extra width allowance when open, for narrow (portrait) screens; on wide screens the vh cap wins anyway.
const VW_BOOST: Record<ScatterPhase, number> = { idle: 1, shrunk: 1, hover: 1, expanded: 1.7 };
// Title image height at title size 1: [min px, % of screen width, max px].
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
// Enough random tilts and nudges for any sensible number of projects.
const MAX_ITEMS = 48;

type Pattern = {
  shortRowFirst: boolean; // with uneven rows, whether the shorter ones go on top
  nudge: { x: number; y: number }[]; // each in -1..1
  tilt: number[]; // each in -1..1
};

// Random, but stable for the life of the page, and a fixed value during server
// render so hydration matches (React swaps in the client value right after).
const SERVER_PATTERN: Pattern = {
  shortRowFirst: true,
  nudge: Array.from({ length: MAX_ITEMS }, () => ({ x: 0, y: 0 })),
  tilt: Array.from({ length: MAX_ITEMS }, () => 0),
};
let clientPattern: Pattern | null = null;
function getPattern(): Pattern {
  if (!clientPattern) {
    const r = () => Math.random() * 2 - 1;
    // tilts alternate in sign so neighbours never lean the same way
    const lean = Math.random() < 0.5 ? 1 : -1;
    clientPattern = {
      shortRowFirst: Math.random() < 0.5,
      nudge: Array.from({ length: MAX_ITEMS }, () => ({ x: r(), y: r() })),
      tilt: Array.from({ length: MAX_ITEMS }, (_, i) => (i % 2 ? -lean : lean) * (0.45 + 0.55 * Math.random())),
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

// centre and width (px within the quadrant), tilt (degrees)
type Placed = { cx: number; cy: number; w: number; tilt: number };

// Split n items into r rows as evenly as possible, e.g. 3 into 2 -> [1, 2] or [2, 1].
function rowCounts(n: number, r: number, shortFirst: boolean): number[] {
  const base = Math.floor(n / r), extra = n % r;
  const counts = Array.from({ length: r }, (_, i) => base + (i < extra ? 1 : 0));
  return shortFirst ? counts.reverse() : counts;
}

function layout(
  projects: SurfaceProject[],
  W: number, // the quadrant's target size, px
  H: number,
  screenW: number,
  screenH: number,
  textBottom: number, // px from the quadrant's top
  phase: ScatterPhase,
  pattern: Pattern,
  titlesOnly: boolean, // lay out just the title images (no logos), for spaces too tight for icons
): Layout {
  const n = projects.length;
  const s = SCALE[phase];
  const [lMin, lVw, lMax] = LABEL[phase];
  const label = Math.min(lMax, Math.max(lMin, (lVw * screenW) / 100));
  const gap = Math.max(12, 0.035 * Math.min(W, H));
  const pad = 24; // matches the text's px-6
  const region = {
    left: pad,
    top: textBottom + gap,
    width: Math.max(0, W - 2 * pad),
    // however long the text above gets, keep at least 45% of the quadrant's height for the
    // thumbnails; with very long text they sit below it (the open quadrant scrolls to them)
    height: Math.max(0.45 * H, H - textBottom - gap - Math.max(pad, 0.06 * H)),
  };

  // preferred widths; everything is scaled together by `f` to fill the space
  const want = projects.map((p) =>
    Math.min((p.size * s * VW_BOOST[phase] * screenW) / 100, (p.size * SIZE_TO_VH_CAP * s * screenH) / 100),
  );
  // titles keep their size unless the thumbnails have to shrink below their preferred size
  // (a narrow quadrant on a phone), then they shrink with them, so everything still fits
  const labelK = (f: number) => Math.min(1, f);
  const labelH = (i: number, f: number) => label * labelK(f) * projects[i].titleSize;
  const labelW = (i: number, f: number) => (labelH(i, f) * projects[i].titleImage.w) / projects[i].titleImage.h;
  // room an item takes across (logo or title, whichever is wider) and down (logo, gap, title)
  const spanOf = (i: number, f: number) =>
    titlesOnly ? labelW(i, f) : Math.max(want[i] * f, labelW(i, f));
  const heightOf = (i: number, f: number) =>
    titlesOnly ? labelH(i, f) : (want[i] * f * projects[i].logo.h) / projects[i].logo.w + 1.6 * labelH(i, f);

  type Rows = { items: number[] }[];
  const rowsFor = (r: number): Rows => {
    let next = 0;
    return rowCounts(n, r, pattern.shortRowFirst).map((c) => ({
      items: Array.from({ length: c }, () => next++),
    }));
  };
  const bounds = (rows: Rows, f: number) => {
    let bw = 0, bh = 0;
    for (const row of rows) {
      const span = row.items.reduce((t, i) => t + spanOf(i, f), 0) + gap * (row.items.length - 1);
      bw = Math.max(bw, span);
      bh += Math.max(...row.items.map((i) => heightOf(i, f)));
    }
    return { w: bw, h: bh + gap * (rows.length - 1) };
  };
  // largest scale at which a row split fills (most of) the space under the text; the
  // preferred widths only set the proportions and a sensible ceiling
  const FILL = 0.84;
  const MAX_F = 2.6;
  const fit = (rows: Rows) => {
    const ok = (f: number) => {
      const b = bounds(rows, f);
      return b.w <= region.width * FILL && b.h <= region.height * FILL;
    };
    if (ok(MAX_F)) return MAX_F;
    let lo = 0.05, hi = MAX_F;
    for (let k = 0; k < 24; k++) { const m = (lo + hi) / 2; if (ok(m)) lo = m; else hi = m; }
    return lo;
  };
  // biggest wins; near-ties go to fewer rows (one row is the resting look)
  const options = Array.from({ length: n }, (_, k) => rowsFor(k + 1));
  const scores = options.map(fit);
  const best = Math.max(...scores);
  const pickIdx = scores.findIndex((sc) => sc >= best * 0.97);
  const rows = options[pickIdx];
  const f = scores[pickIdx];

  // each item's width: its logo's, or with titles only its title's
  const img = want.map((x, i) => (titlesOnly ? labelW(i, f) : x * f));
  const span = img.map((_, i) => spanOf(i, f));
  const ht = img.map((_, i) => heightOf(i, f));
  const b = bounds(rows, f);
  const slackY = Math.max(0, region.height - b.h);
  const rowGap = gap + slackY / (rows.length + 1);
  let y = region.top + region.height / 2 - (b.h + rowGap * (rows.length - 1) - gap * (rows.length - 1)) / 2;
  const placed: Placed[] = [];
  const room: { x: number; y: number }[] = [];
  for (const row of rows) {
    const rowH = Math.max(...row.items.map((i) => ht[i]));
    const rowW = row.items.reduce((t, i) => t + span[i], 0) + gap * (row.items.length - 1);
    const slackX = Math.max(0, region.width - rowW);
    const g = gap + slackX / (row.items.length + 1); // spread across the spare width
    let x = region.left + region.width / 2 - (rowW + (g - gap) * (row.items.length - 1)) / 2;
    for (const i of row.items) {
      placed[i] = { cx: x + span[i] / 2, cy: y + rowH / 2, w: img[i], tilt: 0 };
      room[i] = {
        x: row.items.length === 1 ? (region.width - span[i]) / 2 : (g - gap) / 2 + gap * 0.25,
        y: rows.length === 1 ? (region.height - ht[i]) / 2 : (rowGap - gap) / 2 + gap * 0.25,
      };
      x += span[i] + g;
    }
    y += rowH + rowGap;
  }

  // tilt each and nudge it off its spot by its random amount, within the room it has
  const k = NUDGE[phase];
  placed.forEach((p, i) => {
    p.cx += pattern.nudge[i % MAX_ITEMS].x * Math.max(0, room[i].x) * k;
    p.cy += pattern.nudge[i % MAX_ITEMS].y * Math.max(0, room[i].y) * k;
    p.tilt = pattern.tilt[i % MAX_ITEMS] * MAX_TILT * TILT[phase];
  });

  // Keep clear of the text, counting each one's tilt and the
  // 1.12x it grows to when hovered. Every resting spot clearing the text means the straight
  // paths between them do too, so they never cross it while they fly about.
  const HOVER_GROW = 1.12;
  const clearTop = textBottom + Math.max(10, gap * 0.5);
  placed.forEach((p, i) => {
    const t = (Math.abs(p.tilt) * Math.PI) / 180;
    const halfH = ((ht[i] * Math.cos(t) + span[i] * Math.sin(t)) * HOVER_GROW) / 2;
    if (p.cy - halfH < clearTop) p.cy = clearTop + halfH;
  });
  // when long text has pushed them down to (or past) the bottom, where the open quadrant needs to
  // be able to scroll to so they clear the fixed link at the bottom of the screen
  const lowest = Math.max(...placed.map((p, i) => p.cy + ht[i] / 2));
  const scrollTo = lowest > H - 72 ? lowest + 72 : null;
  return { placed, label: label * labelK(f), titlesOnly, scrollTo };
}

type Layout = { placed: Placed[]; label: number; titlesOnly: boolean; scrollTo: number | null };

// Logos smaller than this (px wide) are too small to read; below it, show just the titles.
const MIN_LOGO = 44;

type Measure = { screenW: number; screenH: number; textBottom: number };

export default function ProjectScatter({
  projects,
  basePath,
  phase,
  timing,
  hidden,
  fadeStyle,
  box,
}: {
  projects: SurfaceProject[];
  basePath: string; // the "What I do" path; project pages are basePath/<slug>
  phase: ScatterPhase;
  timing: string; // e.g. "750ms cubic-bezier(0, 0, 0.2, 1)", the quadrant's own
  hidden: boolean; // faded out and not clickable (another quadrant or a project page is open)
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
      // in the quadrant's content coordinates (where the thumbnails are placed), so it's right
      // however far the open quadrant has been scrolled
      const st = section.getBoundingClientRect().top - section.scrollTop;
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

  let result: Layout | null = null;
  if (m && projects.length) {
    // Lay out for where the quadrant is going, not where it is mid-animation. When it's
    // shrinking to nothing (another quadrant is open), keep the resting layout while it fades.
    const pw = percent(box.width), ph = percent(box.height);
    const tiny = pw < 5 || ph < 5;
    const W = tiny ? m.screenW / 2 : (pw / 100) * m.screenW;
    const H = tiny ? m.screenH / 2 : (ph / 100) * m.screenH;
    const ph2 = tiny ? "idle" : phase;
    result = layout(projects, W, H, m.screenW, m.screenH, m.textBottom, ph2, pattern, false);
    // too tight for readable logos: just the titles, which then get the room to themselves
    if (Math.min(...result.placed.map((p) => p.w)) < MIN_LOGO) {
      result = layout(projects, W, H, m.screenW, m.screenH, m.textBottom, ph2, pattern, true);
    }
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
      {result?.scrollTo != null && (
        // extends the open quadrant's scroll below the lowest thumbnail
        <div aria-hidden className="absolute left-0 h-px w-px" style={{ top: result.scrollTo }} />
      )}
      {result &&
        projects.map((p, i) => {
          const { cx, cy, w, tilt } = result.placed[i];
          const l = result.label * p.titleSize;
          return (
            <figure
              key={p.slug}
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
              {/* the whole thumbnail links to the project's page, and grows on hover or focus */}
              <Link
                href={`${basePath}/${p.slug}`}
                aria-label={p.title}
                tabIndex={hidden ? -1 : undefined}
                className="flex flex-col items-center rounded-lg outline-offset-8 transition-transform duration-300 ease-out hover:scale-[1.12] focus-visible:scale-[1.12] focus-visible:outline-2 focus-visible:outline-current"
              >
                {!result.titlesOnly && (
                <Image
                  src={p.logo.src}
                  alt={p.logoAlt}
                  width={p.logo.w}
                  height={p.logo.h}
                  sizes={`${Math.ceil(p.size * SCALE.expanded * VW_BOOST.expanded)}vw`}
                  className="h-auto w-full"
                  style={{ borderRadius: w * CORNER_RADIUS, transition: `border-radius ${timing}` }}
                />
                )}
                <div
                  className="flex items-center justify-center whitespace-nowrap leading-none"
                  style={{
                    marginTop: result.titlesOnly ? 0 : 0.6 * l,
                    height: l,
                    transition: `height ${timing}, margin-top ${timing}`,
                  }}
                >
                  <Image
                    src={p.titleImage.src}
                    alt=""
                    width={p.titleImage.w}
                    height={p.titleImage.h}
                    unoptimized // small wordmarks (one is an SVG); serve as-is
                    className="h-full w-auto max-w-none"
                  />
                </div>
              </Link>
            </figure>
          );
        })}
    </div>
  );
}
