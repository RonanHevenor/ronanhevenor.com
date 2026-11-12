"use client";

import { useEffect, useRef, useState } from "react";
import { renderMarkdown } from "@/lib/markdown";
import type { ImageRef } from "@/lib/projects";

// A markdown editor in the manner of GitHub's comment box: Write / Preview tabs, a formatting
// toolbar (and ⌘B / ⌘I / ⌘K), and images that can be pasted, dropped in, or picked from disk.
// While an image uploads its place holds "![Uploading name…]()", replaced with the real
// markdown when it's done. The preview runs the site's own renderer, so it shows exactly what
// visitors will see.

type ToolId = "heading" | "bold" | "italic" | "quote" | "code" | "link" | "bullets" | "numbers" | "tasks" | "image";

const TOOLS: { id: ToolId; label: string; title: string; className?: string }[] = [
  { id: "heading", label: "H", title: "Heading", className: "font-semibold" },
  { id: "bold", label: "B", title: "Bold (⌘B)", className: "font-bold" },
  { id: "italic", label: "I", title: "Italic (⌘I)", className: "italic" },
  { id: "quote", label: "❝", title: "Quote" },
  { id: "code", label: "</>", title: "Code" },
  { id: "link", label: "🔗", title: "Link (⌘K)" },
  { id: "bullets", label: "•", title: "Bulleted list" },
  { id: "numbers", label: "1.", title: "Numbered list" },
  { id: "tasks", label: "☐", title: "Task list" },
  { id: "image", label: "🖼", title: "Add images" },
];

type Props = {
  value: string;
  onChange: (v: string) => void;
  uploadImage: (file: File) => Promise<ImageRef>;
  rows?: number;
  label?: string;
};

export default function MarkdownEditor({ value, onChange, uploadImage, rows = 18, label }: Props) {
  const [tab, setTab] = useState<"write" | "preview">("write");
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const ta = useRef<HTMLTextAreaElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  // the latest text, for uploads that finish after more typing
  const latest = useRef(value);
  useEffect(() => {
    latest.current = value;
  }, [value]);

  // Replace the selection (or insert at the cursor) and put the selection where `select` says.
  function edit(fn: (sel: string) => { text: string; select?: [number, number] }) {
    const el = ta.current;
    if (!el) return;
    const { selectionStart: a, selectionEnd: b } = el;
    const before = value.slice(0, a), sel = value.slice(a, b), after = value.slice(b);
    const { text, select } = fn(sel);
    onChange(before + text + after);
    requestAnimationFrame(() => {
      el.focus();
      const [s, e] = select ?? [text.length, text.length];
      el.setSelectionRange(a + s, a + e);
    });
  }

  const wrap = (mark: string, placeholder: string) =>
    edit((sel) => {
      const inner = sel || placeholder;
      return { text: mark + inner + mark, select: [mark.length, mark.length + inner.length] };
    });

  // Prefix every selected line (or the current line).
  function prefixLines(prefix: (i: number) => string) {
    const el = ta.current;
    if (!el) return;
    const start = value.lastIndexOf("\n", el.selectionStart - 1) + 1;
    const endNl = value.indexOf("\n", el.selectionEnd);
    const end = endNl === -1 ? value.length : endNl;
    const lines = value.slice(start, end).split("\n").map((l, i) => prefix(i) + l);
    const text = lines.join("\n");
    onChange(value.slice(0, start) + text + value.slice(end));
    requestAnimationFrame(() => { el.focus(); el.setSelectionRange(start, start + text.length); });
  }

  const link = () =>
    edit((sel) => {
      const t = sel || "link text";
      return { text: `[${t}](https://)`, select: [t.length + 3, t.length + 11] };
    });

  function runTool(id: ToolId) {
    switch (id) {
      case "heading": return prefixLines(() => "### ");
      case "bold": return wrap("**", "bold text");
      case "italic": return wrap("_", "italic text");
      case "quote": return prefixLines(() => "> ");
      case "code":
        return edit((sel) => sel.includes("\n")
          ? { text: "```\n" + sel + "\n```", select: [4, 4 + sel.length] }
          : { text: "`" + (sel || "code") + "`", select: [1, 1 + (sel || "code").length] });
      case "link": return link();
      case "bullets": return prefixLines(() => "- ");
      case "numbers": return prefixLines((i) => `${i + 1}. `);
      case "tasks": return prefixLines(() => "- [ ] ");
      case "image": return fileInput.current?.click();
    }
  }

  async function addImages(files: File[]) {
    const images = files.filter((f) => f.type.startsWith("image/"));
    if (!images.length) return;
    setError(null);
    const el = ta.current;
    const at = el ? el.selectionStart : value.length;
    // one placeholder per image, on its own line
    const marks = images.map((f, i) => `![Uploading ${f.name.replace(/[[\]]/g, "")} ${Date.now()}-${i}…]()`);
    const block = (at > 0 && value[at - 1] !== "\n" ? "\n" : "") + marks.join("\n") + "\n";
    latest.current = value.slice(0, at) + block + value.slice(at);
    onChange(latest.current);
    setUploading((n) => n + images.length);
    await Promise.all(
      images.map(async (file, i) => {
        let replacement = "";
        try {
          const { processImage } = await import("./process-image");
          const ref = await uploadImage(await processImage(file, { maxEdge: 2400 }));
          const alt = file.name.replace(/\.[^.]+$/, "").replace(/[[\]]/g, "");
          replacement = `![${alt}](${ref.src})`;
        } catch (err) {
          setError(`${file.name}: ${err instanceof Error ? err.message : "upload failed"}`);
        }
        onChange(latest.current.replace(marks[i], replacement));
        latest.current = latest.current.replace(marks[i], replacement);
        setUploading((n) => n - 1);
      }),
    );
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (!(e.metaKey || e.ctrlKey)) return;
    const k = e.key.toLowerCase();
    if (k === "b") { e.preventDefault(); wrap("**", "bold text"); }
    else if (k === "i") { e.preventDefault(); wrap("_", "italic text"); }
    else if (k === "k") { e.preventDefault(); link(); }
  }

  const tabClass = (t: string) =>
    `px-3 py-1.5 text-sm rounded-t border border-b-0 ${
      tab === t
        ? "bg-white dark:bg-neutral-950 border-neutral-300 dark:border-neutral-700 font-medium"
        : "border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
    }`;

  return (
    <div className="space-y-0">
      {label && <div className="mb-2 text-sm font-medium">{label}</div>}
      <div className="flex items-end justify-between border-b border-neutral-300 dark:border-neutral-700">
        <div className="flex gap-1">
          <button type="button" className={tabClass("write")} onClick={() => setTab("write")}>Write</button>
          <button type="button" className={tabClass("preview")} onClick={() => setTab("preview")}>Preview</button>
        </div>
        {tab === "write" && (
          <div className="flex flex-wrap gap-0.5 pb-1" role="toolbar" aria-label="Formatting">
            {TOOLS.map((t) => (
              <button
                key={t.id}
                type="button"
                title={t.title}
                aria-label={t.title}
                onClick={() => runTool(t.id)}
                className={`min-w-7 rounded px-1.5 py-0.5 text-sm text-neutral-600 hover:bg-neutral-200 dark:text-neutral-300 dark:hover:bg-neutral-800 ${t.className ?? ""}`}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-b border border-t-0 border-neutral-300 dark:border-neutral-700">
        {tab === "write" ? (
          <div
            className={`relative ${dragging ? "ring-2 ring-blue-500 ring-inset" : ""}`}
            onDragOver={(e) => { if (e.dataTransfer.types.includes("Files")) { e.preventDefault(); setDragging(true); } }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              setDragging(false);
              if (e.dataTransfer.files.length) { e.preventDefault(); addImages(Array.from(e.dataTransfer.files)); }
            }}
          >
            <textarea
              ref={ta}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={onKeyDown}
              onPaste={(e) => {
                const files = Array.from(e.clipboardData.files);
                if (files.some((f) => f.type.startsWith("image/"))) { e.preventDefault(); addImages(files); }
              }}
              rows={rows}
              className="block w-full resize-y bg-transparent px-3 py-2 font-mono text-sm outline-none"
            />
          </div>
        ) : (
          <div
            className="markdown min-h-40 px-4 py-3 text-lg leading-relaxed"
            // sanitized: renderMarkdown drops raw HTML and unsafe URLs
            dangerouslySetInnerHTML={{ __html: renderMarkdown(value) || "<p><em>Nothing to preview.</em></p>" }}
          />
        )}
        <div className="flex items-center justify-between gap-3 border-t border-dashed border-neutral-300 px-3 py-1.5 text-xs text-neutral-500 dark:border-neutral-700">
          <button type="button" className="hover:underline" onClick={() => fileInput.current?.click()}>
            {uploading ? `Uploading ${uploading} image${uploading > 1 ? "s" : ""}…` : "Add images"}
          </button>
        </div>
      </div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => { addImages(Array.from(e.target.files ?? [])); e.target.value = ""; }}
      />
    </div>
  );
}
