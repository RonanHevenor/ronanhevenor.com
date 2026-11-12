import fs from "node:fs/promises";
import path from "node:path";
import { AUTH_COOKIE_NAME, SHIELD_COOKIE_NAME, verifyToken } from "./auth";

// The site's own analytics: anonymous counts, kept on this server, sent nowhere else.
//
// The rule it's built to: nothing here is personal data, so there is nothing a visitor has to
// be told about or asked for. That means, and must keep meaning:
//   - no IP address is ever read, hashed or stored (the country comes from Cloudflare's
//     CF-IPCountry header, which Cloudflare works out before the request reaches us);
//   - no visitor identifier of any kind: no cookie, no localStorage, no fingerprint, no id in
//     memory. Two events can't be tied to the same person, so there are no "unique visitors";
//     a "visit" is one page load, and what happened in it arrives as one summary when it ends;
//   - the browser is only asked for what it sends anyway (the page's path, the referring
//     site); nothing about the device is probed. Device, browser and OS are coarse classes
//     read from the User-Agent header, and the header itself is not kept;
//   - requests that say "don't track me" (Global Privacy Control, Do Not Track) aren't counted.
// If you add a field, check it against that list first.
//
// Storage: one JSON-lines file per UTC day in data/analytics/ (not in git, like the rest of data/).

const DIR = path.join(process.cwd(), "data", "analytics");

export type AnalyticsEvent = {
  t: number; // when, ms
  k: "view" | "leave" | "event";
  p: string; // path
  n?: number; // view: its place in the page load (1 = the visit's first page)
  r?: string; // view 1: referring site (host only)
  c?: string; // country code, from Cloudflare
  d?: "phone" | "tablet" | "desktop";
  b?: string; // browser family
  o?: string; // OS family
  e?: string; // event: name
  x?: string; // event: detail; leave: the pages seen, in order
  s?: number; // leave: seconds the page was in view
  j?: number; // leave: pages seen in the visit
};

const BOT = /bot|crawl|spider|slurp|headless|lighthouse|preview|monitor|curl|wget|python|node-fetch|axios|go-http|java\/|scrapy|facebookexternalhit|embedly|pingdom|uptime/i;

function classify(ua: string): Pick<AnalyticsEvent, "d" | "b" | "o"> {
  const d = /ipad|tablet|kindle|silk|(android(?!.*mobile))/i.test(ua)
    ? "tablet"
    : /mobi|iphone|ipod|android/i.test(ua)
      ? "phone"
      : "desktop";
  const b = /edg\//i.test(ua) ? "Edge"
    : /opr\/|opera/i.test(ua) ? "Opera"
    : /firefox|fxios/i.test(ua) ? "Firefox"
    : /chrome|crios|chromium/i.test(ua) ? "Chrome"
    : /safari/i.test(ua) ? "Safari"
    : "Other";
  const o = /iphone|ipad|ipod/i.test(ua) ? "iOS"
    : /android/i.test(ua) ? "Android"
    : /mac os x|macintosh/i.test(ua) ? "macOS"
    : /windows/i.test(ua) ? "Windows"
    : /cros/i.test(ua) ? "ChromeOS"
    : /linux/i.test(ua) ? "Linux"
    : "Other";
  return { d, b, o };
}

function cookie(header: string | null, name: string): string | null {
  for (const part of (header ?? "").split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return decodeURIComponent(v.join("="));
  }
  return null;
}

// What may be learned from a request's headers, or null if it shouldn't be counted (a bot, a
// "don't track" signal, or Ronan signed in to the admin).
export function fromHeaders(h: Headers): Pick<AnalyticsEvent, "c" | "d" | "b" | "o"> | null {
  const ua = h.get("user-agent") ?? "";
  if (!ua || BOT.test(ua)) return null;
  if (h.get("sec-gpc") === "1" || h.get("dnt") === "1") return null;
  if (cookie(h.get("cookie"), SHIELD_COOKIE_NAME)) return null;
  const session = cookie(h.get("cookie"), AUTH_COOKIE_NAME);
  if (session && verifyToken(session)) return null;
  const c = (h.get("cf-ipcountry") ?? "").toUpperCase();
  return { ...(/^[A-Z]{2}$/.test(c) && c !== "XX" ? { c } : {}), ...classify(ua) };
}

// The referring site as a bare host, or undefined for none or this site itself.
export function refHost(ref: string | null | undefined, ownHost: string | null): string | undefined {
  if (!ref) return undefined;
  try {
    const host = new URL(ref).hostname.replace(/^www\./, "");
    if (!host || host === (ownHost ?? "").split(":")[0].replace(/^www\./, "")) return undefined;
    return host.slice(0, 80);
  } catch {
    return undefined;
  }
}

export const cleanPath = (p: unknown): string | null =>
  typeof p === "string" && p.startsWith("/") && !p.startsWith("/ronan")
    ? p.split(/[?#]/)[0].slice(0, 160)
    : null;

// A ceiling on how fast events are written, so a flood can't fill the disk.
let windowStart = 0;
let windowCount = 0;
const MAX_PER_MINUTE = 600;

export async function record(ev: AnalyticsEvent): Promise<void> {
  const now = Date.now();
  if (now - windowStart > 60_000) { windowStart = now; windowCount = 0; }
  if (++windowCount > MAX_PER_MINUTE) return;
  try {
    await fs.mkdir(DIR, { recursive: true });
    const day = new Date(ev.t).toISOString().slice(0, 10);
    await fs.appendFile(path.join(DIR, `${day}.jsonl`), JSON.stringify(ev) + "\n");
  } catch {
    // analytics must never break the site
  }
}

// A page view seen by the server itself (the plain /html pages run no script).
export function recordServerView(req: Request, p: string): void {
  const who = fromHeaders(req.headers);
  if (!who) return;
  const ref = req.headers.get("referer");
  const r = refHost(ref, req.headers.get("host"));
  // arriving from elsewhere (or nowhere) starts a visit; from this site continues one
  void record({ t: Date.now(), k: "view", p, n: ref && !r ? 2 : 1, ...(r ? { r } : {}), ...who });
}

async function readDay(day: string): Promise<AnalyticsEvent[]> {
  try {
    const text = await fs.readFile(path.join(DIR, `${day}.jsonl`), "utf-8");
    const out: AnalyticsEvent[] = [];
    for (const line of text.split("\n")) {
      if (!line) continue;
      try { out.push(JSON.parse(line)); } catch { /* a torn line */ }
    }
    return out;
  } catch {
    return [];
  }
}

// Every event between two moments (ms).
export async function readRange(from: number, to: number): Promise<AnalyticsEvent[]> {
  const days: string[] = [];
  for (let t = from - 86_400_000; t <= to + 86_400_000; t += 86_400_000) {
    days.push(new Date(t).toISOString().slice(0, 10));
  }
  const all = (await Promise.all([...new Set(days)].map(readDay))).flat();
  return all.filter((e) => e.t >= from && e.t < to);
}

// ---- The summary the admin's analytics tab shows ----

export type Count = { key: string; n: number };
export type Summary = {
  from: number;
  to: number;
  hourly: boolean;
  totals: Totals;
  previous: Totals;
  series: { t: number; visits: number; views: number }[];
  live: number; // pages viewed in the last five minutes
  pages: Count[];
  quadrants: number[]; // views of each of the four sections, in site order
  projects: Count[];
  referrers: Count[];
  countries: Count[];
  devices: Count[];
  browsers: Count[];
  systems: Count[];
  journeys: Count[];
  events: Count[];
  heat: number[][]; // [weekday 0=Mon][hour] views
  recent: { t: number; p: string; c?: string; d?: string }[];
};
export type Totals = {
  visits: number;
  views: number;
  perVisit: number;
  seconds: number | null; // median time a visit's page was in view
  bounce: number | null; // share of visits that saw one page
};

function totals(events: AnalyticsEvent[]): Totals {
  const views = events.filter((e) => e.k === "view");
  const visits = views.filter((e) => e.n === 1).length;
  const leaves = events.filter((e) => e.k === "leave");
  const secs = leaves.map((e) => e.s ?? 0).filter((s) => s > 0).sort((a, b) => a - b);
  return {
    visits,
    views: views.length,
    perVisit: visits ? views.length / visits : 0,
    seconds: secs.length ? secs[Math.floor(secs.length / 2)] : null,
    bounce: leaves.length ? leaves.filter((e) => (e.j ?? 1) <= 1).length / leaves.length : null,
  };
}

function top(items: (string | undefined)[], limit = 8): Count[] {
  const m = new Map<string, number>();
  for (const k of items) if (k) m.set(k, (m.get(k) ?? 0) + 1);
  return [...m].map(([key, n]) => ({ key, n })).sort((a, b) => b.n - a.n).slice(0, limit);
}

export async function summarize(
  days: number, // 1, 7, 30 or 90
  tzOffsetMin: number, // the viewer's Date#getTimezoneOffset(), so days and hours are theirs
  quadrantSlugs: string[],
): Promise<Summary> {
  const now = Date.now();
  const local = (t: number) => t - tzOffsetMin * 60_000; // shift so UTC getters read local time
  const hourly = days === 1;
  const step = hourly ? 3_600_000 : 86_400_000;
  // the range ends at the end of the current local hour/day and covers `days` days
  const end = Math.ceil(local(now) / step) * step + tzOffsetMin * 60_000;
  const from = end - days * 86_400_000;
  const [events, before] = await Promise.all([
    readRange(from, end),
    readRange(from - days * 86_400_000, from),
  ]);
  const views = events.filter((e) => e.k === "view");

  const buckets = Math.round((end - from) / step);
  const series = Array.from({ length: buckets }, (_, i) => ({ t: from + i * step, visits: 0, views: 0 }));
  const heat = Array.from({ length: 7 }, () => Array<number>(24).fill(0));
  for (const e of views) {
    const b = series[Math.floor((e.t - from) / step)];
    if (b) { b.views++; if (e.n === 1) b.visits++; }
    const d = new Date(local(e.t));
    heat[(d.getUTCDay() + 6) % 7][d.getUTCHours()]++;
  }

  const section = (p: string) => p.split("/")[1] ?? "";
  const workSlug = quadrantSlugs[1];
  return {
    from,
    to: end,
    hourly,
    totals: totals(events),
    previous: totals(before),
    series,
    live: views.filter((e) => e.t > now - 300_000).length,
    pages: top(views.map((e) => e.p), 10),
    quadrants: quadrantSlugs.map((s) => views.filter((e) => !e.p.startsWith("/html") && section(e.p) === s).length),
    projects: top(views.filter((e) => section(e.p) === workSlug && e.p.split("/")[2]).map((e) => e.p.split("/")[2])),
    referrers: top(views.filter((e) => e.n === 1).map((e) => e.r ?? "(direct)")),
    countries: top(views.filter((e) => e.n === 1).map((e) => e.c), 12),
    devices: top(views.filter((e) => e.n === 1).map((e) => e.d)),
    browsers: top(views.filter((e) => e.n === 1).map((e) => e.b)),
    systems: top(views.filter((e) => e.n === 1).map((e) => e.o)),
    journeys: top(events.filter((e) => e.k === "leave" && (e.j ?? 0) > 1).map((e) => e.x), 6),
    events: top(events.filter((e) => e.k === "event").map((e) => (e.x ? `${e.e}: ${e.x}` : e.e)), 10),
    heat,
    recent: views.slice(-30).reverse().map(({ t, p, c, d }) => ({ t, p, c, d })),
  };
}
