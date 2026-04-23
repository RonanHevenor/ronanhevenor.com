"use client";

import { useEffect, useState } from "react";
import type { Photo, Post, Quadrant, Sections } from "@/lib/data";
import {
  createPost,
  deletePhoto,
  deletePost,
  listContent,
  logout,
  saveQuadrants,
  saveSection,
  updatePost,
  uploadPhotos,
} from "./actions";

const INITIAL_QUADRANTS: Quadrant[] = [
  { title: "", slug: "" },
  { title: "", slug: "" },
  { title: "", slug: "" },
  { title: "", slug: "" },
];

const inputClass =
  "w-full border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2 text-sm";

export default function RonanAdmin() {
  const [tab, setTab] = useState<
    "photos" | "posts" | "sections" | "quadrants"
  >("photos");
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [sections, setSections] = useState<Sections>({
    whatido: "",
    whoiam: "",
    quadrants: INITIAL_QUADRANTS,
  });
  const [loaded, setLoaded] = useState(false);

  async function refresh() {
    const c = await listContent();
    setPhotos(c.photos);
    setPosts(c.posts);
    setSections(c.sections);
    setLoaded(true);
  }

  useEffect(() => {
    refresh();
  }, []);

  const tabs = [
    { k: "photos" as const, count: photos.length },
    { k: "posts" as const, count: posts.length },
    { k: "sections" as const, count: null },
    { k: "quadrants" as const, count: null },
  ];

  return (
    <div className="flex-1 flex justify-center p-6">
      <div className="w-full max-w-3xl space-y-6">
        <header className="flex items-baseline justify-between">
          <h1 className="text-2xl font-semibold tracking-tight">ronan admin</h1>
          <div className="flex items-center gap-4 text-sm text-neutral-500">
            <a href="/" className="hover:underline">
              ← site
            </a>
            <form action={logout}>
              <button type="submit" className="hover:underline">
                sign out
              </button>
            </form>
          </div>
        </header>

        <nav className="flex gap-6 border-b border-neutral-300 dark:border-neutral-700">
          {tabs.map(({ k, count }) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={`pb-2 -mb-px border-b-2 text-sm ${
                tab === k
                  ? "border-current font-medium"
                  : "border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
              }`}
            >
              {k}
              {count !== null ? ` (${count})` : ""}
            </button>
          ))}
        </nav>

        {!loaded ? (
          <p className="text-neutral-500">Loading...</p>
        ) : tab === "photos" ? (
          <PhotosTab photos={photos} refresh={refresh} />
        ) : tab === "posts" ? (
          <PostsTab posts={posts} refresh={refresh} />
        ) : tab === "sections" ? (
          <SectionsTab sections={sections} refresh={refresh} />
        ) : (
          <QuadrantsTab
            quadrants={sections.quadrants}
            refresh={refresh}
          />
        )}
      </div>
    </div>
  );
}

function PhotosTab({
  photos,
  refresh,
}: {
  photos: Photo[];
  refresh: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    setBusy(true);
    setStatus(null);
    try {
      const res = await uploadPhotos(data);
      setStatus(
        `added ${res.added}${res.skipped ? `, skipped ${res.skipped}` : ""}`,
      );
      await refresh();
      form.reset();
    } catch (err) {
      setStatus(`error: ${err instanceof Error ? err.message : "failed"}`);
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(src: string) {
    setBusy(true);
    try {
      await deletePhoto(src);
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={onSubmit} className="space-y-3">
        <label className="block text-sm font-medium">upload images</label>
        <input
          name="files"
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp"
          required
          className="block w-full text-sm"
        />
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={busy}
            className="px-4 py-2 bg-black text-white text-sm disabled:opacity-50 dark:bg-white dark:text-black"
          >
            {busy ? "working..." : "upload"}
          </button>
          {status && <span className="text-sm text-neutral-500">{status}</span>}
        </div>
      </form>

      {photos.length === 0 ? (
        <p className="text-neutral-500 text-sm">no photos yet</p>
      ) : (
        <ul className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {photos.map((p) => (
            <li key={p.src} className="relative group">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/gallery/${p.src}`}
                alt=""
                className="w-full h-32 object-cover bg-neutral-200 dark:bg-neutral-800"
              />
              <button
                type="button"
                onClick={() => onDelete(p.src)}
                disabled={busy}
                className="absolute top-1 right-1 bg-red-600 text-white text-xs px-2 py-1 opacity-0 group-hover:opacity-100 disabled:opacity-50"
              >
                delete
              </button>
              <p className="text-xs text-neutral-500 mt-1 truncate">
                {p.src} · {p.w}×{p.h}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function PostsTab({
  posts,
  refresh,
}: {
  posts: Post[];
  refresh: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const title = String(data.get("title") || "").trim();
    const date = String(data.get("date") || "");
    const body = String(data.get("body") || "");
    const slug = String(data.get("slug") || "").trim();
    if (!title || !body) {
      setStatus("title and body required");
      return;
    }
    setBusy(true);
    setStatus(null);
    try {
      const post = await createPost({
        title,
        date,
        body,
        slug: slug || undefined,
      });
      setStatus(`published /${post.slug}`);
      await refresh();
      form.reset();
    } catch (err) {
      setStatus(`error: ${err instanceof Error ? err.message : "failed"}`);
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(slug: string) {
    setBusy(true);
    try {
      await deletePost(slug);
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-6">
      <form onSubmit={onSubmit} className="space-y-3">
        <label className="block text-sm font-medium">new post (markdown)</label>
        <input name="title" placeholder="title" required className={inputClass} />
        <div className="flex gap-3">
          <input
            name="date"
            type="date"
            defaultValue={today}
            className={inputClass}
          />
          <input
            name="slug"
            placeholder="slug (optional)"
            className={inputClass}
          />
        </div>
        <textarea
          name="body"
          placeholder="post body — markdown: **bold**, *italic*, [link](url), lists, headings"
          required
          rows={12}
          className={`${inputClass} font-mono`}
        />
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={busy}
            className="px-4 py-2 bg-black text-white text-sm disabled:opacity-50 dark:bg-white dark:text-black"
          >
            {busy ? "working..." : "publish"}
          </button>
          {status && <span className="text-sm text-neutral-500">{status}</span>}
        </div>
      </form>

      {posts.length === 0 ? (
        <p className="text-neutral-500 text-sm">no posts yet</p>
      ) : (
        <ul className="divide-y divide-neutral-200 dark:divide-neutral-800">
          {posts.map((p) => (
            <PostRow
              key={p.slug}
              post={p}
              refresh={refresh}
              onDelete={onDelete}
              disabled={busy}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function SectionsTab({
  sections,
  refresh,
}: {
  sections: Sections;
  refresh: () => Promise<void>;
}) {
  return (
    <div className="space-y-8">
      <SectionEditor
        label="What I do"
        sectionKey="whatido"
        initial={sections.whatido}
        refresh={refresh}
      />
      <SectionEditor
        label="Who I am"
        sectionKey="whoiam"
        initial={sections.whoiam}
        refresh={refresh}
      />
    </div>
  );
}

function SectionEditor({
  label,
  sectionKey,
  initial,
  refresh,
}: {
  label: string;
  sectionKey: "whatido" | "whoiam";
  initial: string;
  refresh: () => Promise<void>;
}) {
  const [value, setValue] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    setValue(initial);
  }, [initial]);

  async function onSave() {
    setBusy(true);
    setStatus(null);
    try {
      await saveSection(sectionKey, value);
      setStatus("saved");
      await refresh();
    } catch (err) {
      setStatus(`error: ${err instanceof Error ? err.message : "failed"}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium">{label} (markdown)</label>
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={10}
        className={`${inputClass} font-mono`}
      />
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onSave}
          disabled={busy || value === initial}
          className="px-4 py-2 bg-black text-white text-sm disabled:opacity-50 dark:bg-white dark:text-black"
        >
          {busy ? "saving..." : "save"}
        </button>
        {status && <span className="text-sm text-neutral-500">{status}</span>}
      </div>
    </div>
  );
}

function QuadrantsTab({
  quadrants,
  refresh,
}: {
  quadrants: Quadrant[];
  refresh: () => Promise<void>;
}) {
  const [draft, setDraft] = useState<Quadrant[]>(quadrants);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    setDraft(quadrants);
  }, [quadrants]);

  const dirty = draft.some(
    (q, i) => q.title !== quadrants[i].title || q.slug !== quadrants[i].slug,
  );

  function update(i: number, field: "title" | "slug", value: string) {
    setDraft((prev) =>
      prev.map((q, idx) => (idx === i ? { ...q, [field]: value } : q)),
    );
  }

  async function onSave() {
    setBusy(true);
    setStatus(null);
    try {
      await saveQuadrants(draft);
      setStatus("saved");
      await refresh();
    } catch (err) {
      setStatus(`error: ${err instanceof Error ? err.message : "failed"}`);
    } finally {
      setBusy(false);
    }
  }

  const labels = ["slideshow", "markdown", "markdown", "blog posts"] as const;

  return (
    <div className="space-y-6">
      <p className="text-sm text-neutral-500">
        Edit the title (header) and URL slug of each quadrant. Body type is
        fixed by position. Changing quadrant 4's slug breaks existing blog
        post URLs.
      </p>
      <div className="space-y-4">
        {draft.map((q, i) => (
          <div
            key={i}
            className="grid grid-cols-[auto_1fr_1fr] gap-3 items-center"
          >
            <span className="text-xs text-neutral-500 w-24">
              {i + 1}. {labels[i]}
            </span>
            <input
              value={q.title}
              onChange={(e) => update(i, "title", e.target.value)}
              placeholder="title"
              className={inputClass}
            />
            <div className="flex items-center gap-2">
              <span className="text-neutral-500 text-sm">/</span>
              <input
                value={q.slug}
                onChange={(e) => update(i, "slug", e.target.value)}
                placeholder="slug"
                className={`${inputClass} font-mono`}
              />
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onSave}
          disabled={busy || !dirty}
          className="px-4 py-2 bg-black text-white text-sm disabled:opacity-50 dark:bg-white dark:text-black"
        >
          {busy ? "saving..." : "save"}
        </button>
        {status && <span className="text-sm text-neutral-500">{status}</span>}
      </div>
    </div>
  );
}

function PostRow({
  post,
  refresh,
  onDelete,
  disabled,
}: {
  post: Post;
  refresh: () => Promise<void>;
  onDelete: (slug: string) => Promise<void>;
  disabled: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(post.title);
  const [date, setDate] = useState(post.date);
  const [slug, setSlug] = useState(post.slug);
  const [body, setBody] = useState(post.body);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!editing) {
      setTitle(post.title);
      setDate(post.date);
      setSlug(post.slug);
      setBody(post.body);
      setStatus(null);
    }
  }, [editing, post]);

  async function onSave() {
    setBusy(true);
    setStatus(null);
    try {
      await updatePost(post.slug, {
        title,
        date,
        body,
        slug: slug || undefined,
      });
      await refresh();
      setEditing(false);
    } catch (err) {
      setStatus(`error: ${err instanceof Error ? err.message : "failed"}`);
    } finally {
      setBusy(false);
    }
  }

  if (!editing) {
    return (
      <li className="flex items-center justify-between gap-4 py-3">
        <div className="min-w-0 flex-1">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="font-medium hover:underline text-left"
          >
            {post.title}
          </button>
          <p className="text-xs text-neutral-500 mt-0.5">
            {post.date} · /{post.slug}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setEditing(true)}
          disabled={disabled}
          className="text-sm text-neutral-500 hover:underline disabled:opacity-50"
        >
          edit
        </button>
        <button
          type="button"
          onClick={() => onDelete(post.slug)}
          disabled={disabled}
          className="text-sm text-red-600 disabled:opacity-50"
        >
          delete
        </button>
      </li>
    );
  }

  return (
    <li className="py-4 space-y-3">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="title"
        className={inputClass}
      />
      <div className="flex gap-3">
        <input
          value={date}
          onChange={(e) => setDate(e.target.value)}
          type="date"
          className={inputClass}
        />
        <input
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          placeholder="slug"
          className={`${inputClass} font-mono`}
        />
      </div>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={14}
        className={`${inputClass} font-mono`}
      />
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onSave}
          disabled={busy || !title.trim() || !body.trim()}
          className="px-4 py-2 bg-black text-white text-sm disabled:opacity-50 dark:bg-white dark:text-black"
        >
          {busy ? "saving..." : "save"}
        </button>
        <button
          type="button"
          onClick={() => setEditing(false)}
          disabled={busy}
          className="text-sm text-neutral-500 hover:underline disabled:opacity-50"
        >
          cancel
        </button>
        {status && <span className="text-sm text-red-600">{status}</span>}
      </div>
    </li>
  );
}
