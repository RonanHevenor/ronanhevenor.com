"use client";

import { useEffect, useRef, useState } from "react";
import type { Quadrant } from "@/lib/data";
import type { Count, Summary, Totals } from "@/lib/analytics";
import { getAnalytics } from "./actions";

// The admin's analytics tab. Everything shown is an anonymous count (src/lib/analytics.ts):
// there are no visitors here, only visits (page loads) and what was viewed in them.
// Colours are the .viz variables in globals.css: two series (visits blue, page views orange),
// one blue ramp for magnitude, and text always in ink.

const RANGES = [
  { days: 1, label: "Today" },
  { days: 7, label: "7 days" },
  { days: 30, label: "30 days" },
  { days: 90, label: "90 days" },
];
const REFRESH_MS = 20_000;
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const num = (n: number) => n.toLocaleString();
const duration = (s: number | null) =>
  s === null ? "–" : s < 60 ? `${Math.round(s)}s` : `${Math.floor(s / 60)}m ${String(Math.round(s % 60)).padStart(2, "0")}s`;
const flag = (cc: string) => String.fromCodePoint(...[...cc].map((ch) => 0x1f1e6 + ch.charCodeAt(0) - 65));
const regions = typeof Intl !== "undefined" ? new Intl.DisplayNames(["en"], { type: "region" }) : null;
const country = (cc: string) => `${flag(cc)}  ${regions?.of(cc) ?? cc}`;
// which of the ramp's six steps a value takes (0 = none)
const step = (n: number, max: number) => (n <= 0 || max <= 0 ? 0 : 1 + Math.min(5, Math.floor((n / max) * 5.999)));

export default function AnalyticsTab({ quadrants }: { quadrants: Quadrant[] }) {
  const [days, setDays] = useState(7);
  const [data, setData] = useState<Summary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadedAt, setLoadedAt] = useState(0); // for "3 min ago"

  useEffect(() => {
    let on = true;
    const load = () =>
      getAnalytics(days, new Date().getTimezoneOffset())
        .then((d) => { if (on) { setData(d); setLoadedAt(Date.now()); setError(null); } })
        .catch((e) => { if (on) setError(e instanceof Error ? e.message : "couldn't load"); });
    load();
    const id = setInterval(load, REFRESH_MS);
    return () => { on = false; clearInterval(id); };
  }, [days]);

  return (
    <div className="viz space-y-6">
      {/* filters: one row, above everything they affect */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-md border border-[var(--viz-grid)] p-0.5 text-sm" role="group" aria-label="Period">
          {RANGES.map((r) => (
            <button
              key={r.days}
              type="button"
              aria-pressed={days === r.days}
              onClick={() => { setData(null); setDays(r.days); }}
              className={`rounded px-3 py-1 ${days === r.days ? "bg-[var(--viz-ink)] text-[var(--viz-surface)]" : "text-[var(--viz-ink-2)] hover:bg-[var(--viz-wash)]"}`}
            >
              {r.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 text-sm text-[var(--viz-ink-2)]" aria-live="polite">
          <span className="relative flex h-2.5 w-2.5">
            {!!data?.live && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--viz-s1)] opacity-60" />}
            <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${data?.live ? "bg-[var(--viz-s1)]" : "bg-[var(--viz-axis)]"}`} />
          </span>
          <span>
            <strong className="font-semibold text-[var(--viz-ink)]">{data ? num(data.live) : "–"}</strong>{" "}
            {data?.live === 1 ? "page" : "pages"} viewed in the last 5 minutes
          </span>
        </div>
      </div>

      {error && <p className="text-sm text-[var(--viz-ink-2)]">Couldn&rsquo;t load the numbers: {error}</p>}
      {!data ? (
        <p className="py-16 text-center text-sm text-[var(--viz-muted)]">Counting…</p>
      ) : data.totals.views === 0 && data.previous.views === 0 ? (
        <p className="py-16 text-center text-sm text-[var(--viz-muted)]">
          Nothing yet
        </p>
      ) : (
        <>
          <Tiles now={data.totals} before={data.previous} series={data.series} label={RANGES.find((r) => r.days === days)!.label.toLowerCase()} />
          <Panel title={data.hourly ? "Today, hour by hour" : "Visits and page views per day"}>
            <TimeChart data={data} />
          </Panel>

          <div className="grid gap-6 lg:grid-cols-2">
            <Panel title="Where on the site">
              <SiteMap quadrants={quadrants} counts={data.quadrants} />
            </Panel>
            <Panel title="When people visit">
              <HeatMap heat={data.heat} />
            </Panel>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Panel title="Pages"><Bars rows={data.pages} unit="views" empty="No pages viewed" /></Panel>
            <Panel title="Projects opened"><Bars rows={data.projects} unit="views" empty="No project opened yet" /></Panel>
            <Panel title="Where visits came from"><Bars rows={data.referrers} unit="visits" empty="No visits" /></Panel>
            <Panel title="Countries"><Bars rows={data.countries} unit="visits" label={country} empty="No country reported" /></Panel>
            <Panel title="Devices">
              <Bars rows={data.devices} unit="visits" empty="No visits" />
              <h4 className="mt-4 mb-2 text-xs text-[var(--viz-muted)]">Browsers</h4>
              <Bars rows={data.browsers} unit="visits" empty="" />
              <h4 className="mt-4 mb-2 text-xs text-[var(--viz-muted)]">Systems</h4>
              <Bars rows={data.systems} unit="visits" empty="" />
            </Panel>
            <Panel title="Things people did">
              <Bars rows={data.events} unit="times" empty="Nothing yet" />
            </Panel>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Panel title="Paths through the site">
              <Bars rows={data.journeys} unit="visits" empty="No multi-page visits reported yet" />
            </Panel>
            <Panel title="Just now">
              <Recent rows={data.recent} now={loadedAt} />
            </Panel>
          </div>

        </>
      )}
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-[var(--viz-grid)] bg-[var(--viz-surface)] p-4">
      <h3 className="text-sm font-medium text-[var(--viz-ink)]">{title}</h3>
      <div className="mt-3">{children}</div>
    </section>
  );
}

// ---- headline numbers ----

function Tiles({ now, before, series, label }: { now: Totals; before: Totals; series: Summary["series"]; label: string }) {
  const tiles: { name: string; value: string; a: number | null; b: number | null; spark?: number[]; lowerIsBetter?: boolean }[] = [
    { name: "Visits", value: num(now.visits), a: now.visits, b: before.visits, spark: series.map((s) => s.visits) },
    { name: "Page views", value: num(now.views), a: now.views, b: before.views, spark: series.map((s) => s.views) },
    { name: "Pages per visit", value: now.visits ? now.perVisit.toFixed(1) : "–", a: now.perVisit, b: before.perVisit },
    { name: "Median time on site", value: duration(now.seconds), a: now.seconds, b: before.seconds },
    { name: "Left after one page", value: now.bounce === null ? "–" : `${Math.round(now.bounce * 100)}%`, a: now.bounce, b: before.bounce },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
      {tiles.map((t) => {
        const change = t.a !== null && t.b ? (t.a - t.b) / t.b : null;
        return (
          <div key={t.name} className="rounded-lg border border-[var(--viz-grid)] bg-[var(--viz-surface)] p-4">
            <div className="text-xs text-[var(--viz-ink-2)]">{t.name}</div>
            <div className="mt-1 text-3xl font-semibold tracking-tight text-[var(--viz-ink)]">{t.value}</div>
            <div className="mt-1 flex items-end justify-between gap-2">
              <span className="text-xs text-[var(--viz-muted)]" title={`Compared with the ${label} before`}>
                {change === null ? "no earlier data" : `${change > 0 ? "▲" : change < 0 ? "▼" : "•"} ${Math.abs(Math.round(change * 100))}% vs before`}
              </span>
              {t.spark && <Spark values={t.spark} />}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Spark({ values }: { values: number[] }) {
  const max = Math.max(1, ...values);
  const pts = values.map((v, i) => `${(i / Math.max(1, values.length - 1)) * 60},${18 - (v / max) * 16}`).join(" ");
  return (
    <svg width="60" height="20" viewBox="0 0 60 20" aria-hidden="true" className="shrink-0">
      <polyline points={pts} fill="none" stroke="var(--viz-s1)" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

// ---- visits and page views over time ----

function niceMax(v: number) {
  if (v <= 4) return 4;
  const p = 10 ** Math.floor(Math.log10(v));
  return [1, 2, 4, 5, 10].map((m) => m * p).find((m) => m >= v)!;
}

function TimeChart({ data }: { data: Summary }) {
  const W = 1000, H = 260, L = 40, R = 86, T = 12, B = 28;
  const s = data.series;
  const max = niceMax(Math.max(...s.map((p) => p.views)));
  const x = (i: number) => L + (i / Math.max(1, s.length - 1)) * (W - L - R);
  const y = (v: number) => T + (1 - v / max) * (H - T - B);
  const line = (key: "visits" | "views") => s.map((p, i) => `${x(i)},${y(p[key])}`).join(" ");
  const [hover, setHover] = useState<number | null>(null);
  const svg = useRef<SVGSVGElement>(null);
  const tick = (t: number) =>
    data.hourly
      ? new Date(t).toLocaleTimeString([], { hour: "numeric" })
      : new Date(t).toLocaleDateString([], { month: "short", day: "numeric" });
  const every = Math.max(1, Math.ceil(s.length / 8));
  const last = s.length - 1;
  // keep the two end labels from sitting on each other
  const gap = Math.abs(y(s[last].views) - y(s[last].visits)) < 14;

  return (
    <div className="relative">
      <div className="mb-2 flex gap-4 text-xs text-[var(--viz-ink-2)]">
        <span className="inline-flex items-center gap-1.5"><i className="inline-block h-0.5 w-4 bg-[var(--viz-s1)]" />Visits</span>
        <span className="inline-flex items-center gap-1.5"><i className="inline-block h-0.5 w-4 bg-[var(--viz-s2)]" />Page views</span>
      </div>
      <svg
        ref={svg}
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label="Visits and page views over the period; the same numbers are in the table below"
        onMouseMove={(e) => {
          const r = svg.current!.getBoundingClientRect();
          const px = ((e.clientX - r.left) / r.width) * W;
          setHover(Math.max(0, Math.min(last, Math.round(((px - L) / (W - L - R)) * last))));
        }}
        onMouseLeave={() => setHover(null)}
      >
        {[0, 0.25, 0.5, 0.75, 1].map((f) => (
          <g key={f}>
            <line x1={L} x2={W - R} y1={y(max * f)} y2={y(max * f)} stroke={f === 0 ? "var(--viz-axis)" : "var(--viz-grid)"} strokeWidth="1" />
            <text x={L - 8} y={y(max * f) + 4} textAnchor="end" fontSize="11" fill="var(--viz-muted)" style={{ fontVariantNumeric: "tabular-nums" }}>
              {num(Math.round(max * f))}
            </text>
          </g>
        ))}
        {s.map((p, i) => i % every === 0 && (
          <text key={p.t} x={x(i)} y={H - 8} textAnchor="middle" fontSize="11" fill="var(--viz-muted)">{tick(p.t)}</text>
        ))}
        <polyline points={line("views")} fill="none" stroke="var(--viz-s2)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        <polyline points={line("visits")} fill="none" stroke="var(--viz-s1)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {/* direct labels at the line ends, in ink beside a mark of the series colour */}
        <circle cx={x(last)} cy={y(s[last].views)} r="4" fill="var(--viz-s2)" stroke="var(--viz-surface)" strokeWidth="2" />
        <text x={x(last) + 9} y={y(s[last].views) + (gap ? -4 : 4)} fontSize="11" fill="var(--viz-ink-2)">Page views</text>
        <circle cx={x(last)} cy={y(s[last].visits)} r="4" fill="var(--viz-s1)" stroke="var(--viz-surface)" strokeWidth="2" />
        <text x={x(last) + 9} y={y(s[last].visits) + (gap ? 12 : 4)} fontSize="11" fill="var(--viz-ink-2)">Visits</text>
        {hover !== null && (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={T} y2={H - B} stroke="var(--viz-axis)" strokeWidth="1" />
            <circle cx={x(hover)} cy={y(s[hover].views)} r="4" fill="var(--viz-s2)" stroke="var(--viz-surface)" strokeWidth="2" />
            <circle cx={x(hover)} cy={y(s[hover].visits)} r="4" fill="var(--viz-s1)" stroke="var(--viz-surface)" strokeWidth="2" />
          </g>
        )}
      </svg>
      {hover !== null && (
        <div
          className="pointer-events-none absolute top-8 z-10 -translate-x-1/2 rounded-md border border-[var(--viz-grid)] bg-[var(--viz-surface)] px-3 py-2 text-xs shadow-lg"
          style={{ left: `${Math.min(88, Math.max(12, (x(hover) / W) * 100))}%` }}
        >
          <div className="mb-1 font-medium text-[var(--viz-ink)]">
            {data.hourly
              ? new Date(s[hover].t).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
              : new Date(s[hover].t).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })}
          </div>
          <div className="flex items-center gap-2 text-[var(--viz-ink-2)]"><i className="inline-block h-2 w-2 rounded-full bg-[var(--viz-s1)]" />Visits <b className="ml-auto pl-3 text-[var(--viz-ink)]">{num(s[hover].visits)}</b></div>
          <div className="flex items-center gap-2 text-[var(--viz-ink-2)]"><i className="inline-block h-2 w-2 rounded-full bg-[var(--viz-s2)]" />Page views <b className="ml-auto pl-3 text-[var(--viz-ink)]">{num(s[hover].views)}</b></div>
        </div>
      )}
      <details className="mt-2 text-xs text-[var(--viz-ink-2)]">
        <summary className="cursor-pointer text-[var(--viz-muted)]">Show as a table</summary>
        <table className="mt-2 w-full max-w-sm" style={{ fontVariantNumeric: "tabular-nums" }}>
          <thead><tr className="text-left text-[var(--viz-muted)]"><th className="font-normal">When</th><th className="text-right font-normal">Visits</th><th className="text-right font-normal">Page views</th></tr></thead>
          <tbody>
            {s.map((p) => (
              <tr key={p.t}><td>{tick(p.t)}</td><td className="text-right">{num(p.visits)}</td><td className="text-right">{num(p.views)}</td></tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}

// ---- the site's four quadrants, shaded by how much each was viewed ----

function SiteMap({ quadrants, counts }: { quadrants: Quadrant[]; counts: number[] }) {
  const max = Math.max(...counts);
  const total = counts.reduce((a, b) => a + b, 0);
  return (
    <div className="grid aspect-[16/10] grid-cols-2 grid-rows-2 gap-0.5 overflow-hidden rounded-md">
      {quadrants.map((q, i) => {
        const st = step(counts[i], max);
        return (
          <div
            key={q.slug}
            className="flex flex-col justify-between p-3"
            style={{ background: `var(--viz-seq-${st})`, color: st >= 4 ? "var(--viz-on-strong)" : "var(--viz-ink)" }}
            title={`${q.title}: ${num(counts[i])} page views`}
          >
            <span className="text-sm font-medium">{q.title}</span>
            <span>
              <span className="text-2xl font-semibold tracking-tight">{num(counts[i])}</span>
              <span className="ml-2 text-xs opacity-80">{total ? `${Math.round((counts[i] / total) * 100)}%` : ""}</span>
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ---- weekday by hour ----

function HeatMap({ heat }: { heat: number[][] }) {
  const max = Math.max(...heat.flat());
  const [at, setAt] = useState<[number, number] | null>(null);
  const hour = (h: number) => new Date(2000, 0, 1, h).toLocaleTimeString([], { hour: "numeric" });
  return (
    <div>
      <div className="grid gap-0.5" style={{ gridTemplateColumns: "2.25rem repeat(24, minmax(0, 1fr))" }} onMouseLeave={() => setAt(null)}>
        {heat.map((row, d) => (
          <div key={d} className="contents">
            <span className="self-center text-xs text-[var(--viz-muted)]">{DAYS[d]}</span>
            {row.map((n, h) => (
              <span
                key={h}
                className="aspect-square rounded-[2px]"
                style={{ background: `var(--viz-seq-${step(n, max)})`, outline: at && at[0] === d && at[1] === h ? "2px solid var(--viz-ink)" : undefined }}
                onMouseEnter={() => setAt([d, h])}
                aria-label={`${DAYS[d]} ${hour(h)}: ${n} page views`}
              />
            ))}
          </div>
        ))}
        <span />
        {Array.from({ length: 24 }, (_, h) => (
          <span key={h} className="text-center text-[10px] text-[var(--viz-muted)]">{h % 6 === 0 ? hour(h).replace(/\s/g, "").toLowerCase() : ""}</span>
        ))}
      </div>
      <div className="mt-2 flex items-center justify-between text-xs text-[var(--viz-ink-2)]">
        <span>{at ? <>{DAYS[at[0]]} {hour(at[1])}: <b className="text-[var(--viz-ink)]">{num(heat[at[0]][at[1]])}</b> page views</> : null}</span>
        <span className="flex items-center gap-1 text-[var(--viz-muted)]">
          fewer
          {[1, 2, 3, 4, 5, 6].map((s) => <i key={s} className="inline-block h-2.5 w-2.5 rounded-[2px]" style={{ background: `var(--viz-seq-${s})` }} />)}
          more
        </span>
      </div>
    </div>
  );
}

// ---- ranked lists ----

function Bars({ rows, unit, label, empty }: { rows: Count[]; unit: string; label?: (key: string) => string; empty: string }) {
  if (!rows.length) return empty ? <p className="text-xs text-[var(--viz-muted)]">{empty}</p> : null;
  const max = rows[0].n;
  return (
    <ol className="space-y-1.5">
      {rows.map((r) => (
        <li key={r.key} className="group relative" title={`${label ? label(r.key) : r.key}: ${num(r.n)} ${unit}`}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 truncate text-[var(--viz-ink)]">{label ? label(r.key) : r.key}</span>
            <span className="shrink-0 text-[var(--viz-ink-2)]" style={{ fontVariantNumeric: "tabular-nums" }}>{num(r.n)}</span>
          </div>
          <div className="mt-0.5 h-1 rounded-full bg-[var(--viz-wash)]">
            <div className="h-1 rounded-full bg-[var(--viz-s1)] group-hover:brightness-110" style={{ width: `${Math.max(1.5, (r.n / max) * 100)}%` }} />
          </div>
        </li>
      ))}
    </ol>
  );
}

function Recent({ rows, now }: { rows: Summary["recent"]; now: number }) {
  if (!rows.length) return <p className="text-xs text-[var(--viz-muted)]">Nothing yet</p>;
  const ago = (t: number) => {
    const s = Math.max(0, (now - t) / 1000);
    return s < 60 ? "just now" : s < 3600 ? `${Math.floor(s / 60)} min ago` : s < 86400 ? `${Math.floor(s / 3600)} h ago` : `${Math.floor(s / 86400)} d ago`;
  };
  return (
    <ul className="max-h-64 space-y-1 overflow-y-auto text-sm">
      {rows.map((r, i) => (
        <li key={`${r.t}-${i}`} className="flex items-baseline gap-3">
          <span className="w-5 shrink-0 text-center" title={r.c ? regions?.of(r.c) : "Country not reported"}>{r.c ? flag(r.c) : "·"}</span>
          <span className="min-w-0 flex-1 truncate text-[var(--viz-ink)]">{r.p}</span>
          <span className="shrink-0 text-xs text-[var(--viz-muted)]">{r.d}</span>
          <span className="w-20 shrink-0 text-right text-xs text-[var(--viz-muted)]">{ago(r.t)}</span>
        </li>
      ))}
    </ul>
  );
}
