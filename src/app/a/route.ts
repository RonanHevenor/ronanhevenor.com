import { NextResponse, type NextRequest } from "next/server";
import { SHIELD_COOKIE, SHIELD_COOKIE_NAME } from "@/lib/auth";
import { cleanPath, fromHeaders, record, refHost, type AnalyticsEvent } from "@/lib/analytics";

// Where the site's pages report what was viewed (src/app/_components/Tracker.tsx). See
// src/lib/analytics.ts for what is and isn't collected; nothing here reads an IP address.

const text = (v: unknown, max: number): string | undefined =>
  typeof v === "string" && v ? v.slice(0, max) : undefined;
const int = (v: unknown, max: number): number | undefined =>
  typeof v === "number" && Number.isFinite(v) ? Math.max(0, Math.min(max, Math.round(v))) : undefined;

export async function POST(req: NextRequest) {
  const done = new Response(null, { status: 204 });
  // only this site's own pages
  const origin = req.headers.get("origin");
  if (origin && new URL(origin).host !== req.headers.get("host")) return done;
  // Ronan's own browsers: not counted, and the cookie that says so is kept fresh
  if (req.cookies.has(SHIELD_COOKIE_NAME)) {
    const res = new NextResponse(null, { status: 204 });
    res.cookies.set(SHIELD_COOKIE_NAME, "1", SHIELD_COOKIE);
    return res;
  }
  const who = fromHeaders(req.headers);
  if (!who) return done;

  let body: Record<string, unknown>;
  try {
    const raw = await req.text();
    if (raw.length > 2000) return done;
    body = JSON.parse(raw);
  } catch {
    return done;
  }
  const p = cleanPath(body.p);
  if (!p) return done;
  const base = { t: Date.now(), p, ...who };
  let ev: AnalyticsEvent | null = null;
  if (body.k === "view") {
    const n = int(body.n, 999) ?? 1;
    const r = n === 1 ? refHost(text(body.r, 500), req.headers.get("host")) : undefined;
    ev = { ...base, k: "view", n, ...(r ? { r } : {}) };
  } else if (body.k === "leave") {
    ev = { ...base, k: "leave", s: int(body.s, 7200), j: int(body.j, 999), x: text(body.x, 300) };
  } else if (body.k === "event") {
    const e = text(body.e, 40);
    if (e) ev = { ...base, k: "event", e, x: text(body.x, 200) };
  }
  if (ev) await record(ev);
  return done;
}
