"use client";

import { useState } from "react";
import { CORNER_RADIUS, type ImageRef, type Project } from "@/lib/projects";
import { deleteProject, moveProject, saveProject, uploadProjectImage } from "./actions";
import MarkdownEditor from "./MarkdownEditor";
import { processImage } from "./process-image";

// The admin's projects tab: the list (reorder, edit, delete) and the editor for one project.

const inputClass =
  "w-full border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2 text-sm";
const buttonClass =
  "px-4 py-2 bg-black text-white text-sm disabled:opacity-50 dark:bg-white dark:text-black";

type Draft = Omit<Project, "slug"> & { slug?: string };

const EMPTY: Draft = {
  title: "",
  logo: { src: "", w: 0, h: 0 },
  logoAlt: "",
  titleImage: { src: "", w: 0, h: 0 },
  size: 8,
  titleSize: 1.5,
  repo: "",
  href: "",
  body: "",
};

async function upload(file: File): Promise<ImageRef> {
  const data = new FormData();
  data.append("file", file);
  return uploadProjectImage(data);
}

export default function ProjectsTab({
  projects,
  refresh,
}: {
  projects: Project[];
  refresh: () => Promise<void>;
}) {
  // null: the list; "new": a new project; otherwise the slug being edited
  const [editing, setEditing] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (editing !== null) {
    const original = editing === "new" ? null : projects.find((p) => p.slug === editing) ?? null;
    return (
      <ProjectEditor
        key={editing}
        original={original}
        others={projects}
        onDone={async () => { await refresh(); setEditing(null); }}
      />
    );
  }

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    try { await fn(); await refresh(); } finally { setBusy(false); }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-neutral-500">
          Shown in &ldquo;What I do&rdquo;, in this order. Each one gets its own page.
        </p>
        <button type="button" className={buttonClass} onClick={() => setEditing("new")}>
          new project
        </button>
      </div>
      <ul className="divide-y divide-neutral-200 dark:divide-neutral-800">
        {projects.map((p, i) => (
          <li key={p.slug} className="flex items-center gap-4 py-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.logo.src} alt="" className="h-12 w-16 object-contain" />
            <div className="min-w-0 flex-1">
              <div className="font-medium">{p.title}</div>
              <div className="truncate text-xs text-neutral-500">
                /{p.slug}
                {p.body ? "" : " · nothing written yet"}
              </div>
            </div>
            <div className="flex items-center gap-1 text-sm">
              <button type="button" disabled={busy || i === 0} onClick={() => run(() => moveProject(p.slug, -1))} className="px-2 disabled:opacity-30" aria-label={`Move ${p.title} up`}>↑</button>
              <button type="button" disabled={busy || i === projects.length - 1} onClick={() => run(() => moveProject(p.slug, 1))} className="px-2 disabled:opacity-30" aria-label={`Move ${p.title} down`}>↓</button>
              <button type="button" disabled={busy} onClick={() => setEditing(p.slug)} className="px-2 hover:underline">edit</button>
              <button
                type="button"
                disabled={busy}
                onClick={() => { if (confirm(`Delete "${p.title}"? Its page goes too.`)) run(() => deleteProject(p.slug)); }}
                className="px-2 text-red-600 hover:underline"
              >
                delete
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ProjectEditor({
  original,
  others,
  onDone,
}: {
  original: Project | null;
  others: Project[];
  onDone: () => Promise<void>;
}) {
  const [d, setD] = useState<Draft>(original ? { ...original, repo: original.repo ?? "", href: original.href ?? "" } : EMPTY);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((x) => ({ ...x, [k]: v }));

  async function pickImage(which: "logo" | "titleImage", file: File | undefined) {
    if (!file) return;
    setStatus(`uploading ${which === "logo" ? "logo" : "title image"}…`);
    try {
      const ref = await upload(await processImage(file, { trim: true, maxEdge: which === "logo" ? 2000 : 2400 }));
      set(which, ref);
      setStatus(null);
    } catch (err) {
      setStatus(`error: ${err instanceof Error ? err.message : "upload failed"}`);
    }
  }

  async function onSave() {
    setBusy(true);
    setStatus(null);
    try {
      await saveProject(original ? original.slug : null, d);
      await onDone();
    } catch (err) {
      setStatus(`error: ${err instanceof Error ? err.message : "failed"}`);
      setBusy(false);
    }
  }

  // every project at its relative size, this one as currently edited
  const strip: (Draft & { me?: boolean })[] = original
    ? others.map((p) => (p.slug === original.slug ? { ...d, me: true } : p))
    : [...others, { ...d, me: true }];

  return (
    <div className="space-y-8">
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-medium">{original ? `Edit ${original.title}` : "New project"}</h2>
        <button type="button" className="text-sm text-neutral-500 hover:underline" onClick={() => onDone()}>
          cancel
        </button>
      </div>

      <label className="block space-y-2">
        <span className="text-sm font-medium">Title</span>
        <input className={inputClass} value={d.title} onChange={(e) => set("title", e.target.value)} placeholder="Typeset" />
      </label>

      <div className="grid gap-6 sm:grid-cols-2">
        <ImagePicker
          label="Logo (the thumbnail)"
          hint="Transparent edges are trimmed and corners rounded for you."
          image={d.logo}
          round
          onPick={(f) => pickImage("logo", f)}
        />
        <ImagePicker
          label="Title image (its name, in its own type)"
          hint="Shown under the thumbnail and at the top of the project's page."
          image={d.titleImage}
          onPick={(f) => pickImage("titleImage", f)}
        />
      </div>

      <label className="block space-y-2">
        <span className="text-sm font-medium">What the logo shows</span>
        <input
          className={inputClass}
          value={d.logoAlt}
          onChange={(e) => set("logoAlt", e.target.value)}
          placeholder="For screen readers, e.g. “The Typeset app icon: a rainbow Roman numeral II”"
        />
      </label>

      <fieldset className="space-y-4">
        <legend className="text-sm font-medium">How big should it be next to the others?</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Slider label="Thumbnail" value={d.size} min={2} max={30} step={0.1} onChange={(v) => set("size", v)} />
          <Slider label="Title" value={d.titleSize} min={0.5} max={4} step={0.05} onChange={(v) => set("titleSize", v)} />
        </div>
        <SizePreview items={strip} />
      </fieldset>

      <MarkdownEditor
        label="The project's page"
        value={d.body}
        onChange={(v) => set("body", v)}
        uploadImage={upload}
      />

      <div className="flex items-center gap-3">
        <button type="button" className={buttonClass} disabled={busy} onClick={onSave}>
          {busy ? "saving…" : original ? "save" : "create"}
        </button>
        {status && <span className="text-sm text-neutral-500">{status}</span>}
      </div>
    </div>
  );
}

function ImagePicker({
  label,
  hint,
  image,
  round,
  onPick,
}: {
  label: string;
  hint: string;
  image: ImageRef;
  round?: boolean;
  onPick: (f: File | undefined) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="text-sm font-medium">{label}</div>
      <div className="flex h-32 items-center justify-center bg-neutral-200 p-3 dark:bg-neutral-800">
        {image.src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image.src}
            alt=""
            className="max-h-full max-w-full"
            style={round ? { borderRadius: `${CORNER_RADIUS * 100}% / ${(CORNER_RADIUS * 100 * image.w) / image.h}%` } : undefined}
          />
        ) : (
          <span className="text-xs text-neutral-500">none yet</span>
        )}
      </div>
      <input
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        className="block w-full text-sm"
        onChange={(e) => { onPick(e.target.files?.[0]); e.target.value = ""; }}
      />
      <p className="text-xs text-neutral-500">{hint}</p>
    </div>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block space-y-1">
      <span className="flex justify-between text-xs text-neutral-500">
        <span>{label}</span>
        <span>{value.toFixed(step < 0.1 ? 2 : 1)}</span>
      </span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full" />
    </label>
  );
}

// All projects side by side at their relative sizes, as on the site at rest (same corner
// rounding, same label proportions), so sizes can be judged by eye.
function SizePreview({ items }: { items: (Draft & { me?: boolean })[] }) {
  const PX_PER_UNIT = 13; // thumbnail width per point of size
  const LABEL_PX = 12; // title height at title size 1
  return (
    <div className="flex min-h-48 flex-wrap items-center justify-center gap-6 overflow-x-auto bg-neutral-200 px-4 py-6 text-neutral-900">
      {items.map((p, i) => {
        const w = p.size * PX_PER_UNIT;
        return (
          <div
            key={i}
            className={`flex flex-col items-center gap-2 rounded p-1 ${p.me ? "outline-2 outline-offset-4 outline-blue-500" : "opacity-70"}`}
          >
            {p.logo.src ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.logo.src} alt="" style={{ width: w, borderRadius: w * CORNER_RADIUS }} />
            ) : (
              <div className="grid aspect-square place-items-center bg-neutral-300 text-xs text-neutral-500" style={{ width: w }}>logo</div>
            )}
            {p.titleImage.src ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.titleImage.src} alt="" style={{ height: LABEL_PX * p.titleSize }} />
            ) : (
              <div className="text-xs text-neutral-500" style={{ height: LABEL_PX * p.titleSize }}>{p.title || "title"}</div>
            )}
          </div>
        );
      })}
    </div>
  );
}
