"use server";

import fs from "node:fs/promises";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  getPhotos,
  savePhotos,
  getPosts,
  savePosts,
  getSections,
  saveSections,
  type Photo,
  type Post,
  type Sections,
} from "@/lib/data";
import { readImageDims } from "@/lib/image-dims";
import { destroySession, requireAuth } from "@/lib/auth";

const PUBLIC_GALLERY = path.join(process.cwd(), "public", "gallery");

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 128) || "photo";
}

function slugify(s: string): string {
  const base = s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 64);
  return base || "untitled";
}

async function uniqueFilename(base: string): Promise<string> {
  let candidate = base;
  let n = 1;
  while (true) {
    try {
      await fs.access(path.join(PUBLIC_GALLERY, candidate));
      const dot = base.lastIndexOf(".");
      const stem = dot === -1 ? base : base.slice(0, dot);
      const ext = dot === -1 ? "" : base.slice(dot);
      candidate = `${stem}_${n}${ext}`;
      n++;
    } catch {
      return candidate;
    }
  }
}

export async function uploadPhotos(
  formData: FormData,
): Promise<{ added: number; skipped: number }> {
  await requireAuth();
  await fs.mkdir(PUBLIC_GALLERY, { recursive: true });
  const files = formData.getAll("files");
  const existing = await getPhotos();
  const added: Photo[] = [];
  let skipped = 0;

  for (const entry of files) {
    if (!(entry instanceof File) || entry.size === 0) {
      skipped++;
      continue;
    }
    const buf = Buffer.from(await entry.arrayBuffer());
    const dims = readImageDims(buf);
    if (!dims) {
      skipped++;
      continue;
    }
    const safe = sanitizeFilename(entry.name);
    const finalName = await uniqueFilename(safe);
    await fs.writeFile(path.join(PUBLIC_GALLERY, finalName), buf);
    added.push({ src: finalName, w: dims.w, h: dims.h });
  }

  if (added.length > 0) {
    await savePhotos([...existing, ...added]);
    revalidatePath("/", "layout");
  }
  return { added: added.length, skipped };
}

export async function deletePhoto(src: string): Promise<void> {
  await requireAuth();
  const photos = await getPhotos();
  await savePhotos(photos.filter((p) => p.src !== src));
  try {
    await fs.unlink(path.join(PUBLIC_GALLERY, sanitizeFilename(src)));
  } catch {
    // already gone, fine
  }
  revalidatePath("/", "layout");
}

export async function createPost(input: {
  title: string;
  date: string;
  body: string;
  slug?: string;
}): Promise<Post> {
  await requireAuth();
  const posts = await getPosts();
  const base = slugify(input.slug || input.title);
  let slug = base;
  let n = 1;
  while (posts.find((p) => p.slug === slug)) {
    slug = `${base}-${n}`;
    n++;
  }
  const date = input.date || new Date().toISOString().slice(0, 10);
  const post: Post = {
    slug,
    title: input.title.trim(),
    date,
    body: input.body,
  };
  await savePosts([post, ...posts]);
  revalidatePath("/", "layout");
  return post;
}

export async function saveSection(
  key: keyof Sections,
  body: string,
): Promise<void> {
  await requireAuth();
  if (key !== "whatido" && key !== "whoiam") {
    throw new Error("Unknown section");
  }
  const current = await getSections();
  await saveSections({ ...current, [key]: body });
  revalidatePath("/", "layout");
}

export async function deletePost(slug: string): Promise<void> {
  await requireAuth();
  const posts = await getPosts();
  await savePosts(posts.filter((p) => p.slug !== slug));
  revalidatePath("/", "layout");
}

export async function listContent(): Promise<{
  photos: Photo[];
  posts: Post[];
  sections: Sections;
}> {
  await requireAuth();
  const [photos, posts, sections] = await Promise.all([
    getPhotos(),
    getPosts(),
    getSections(),
  ]);
  return { photos, posts, sections };
}

export async function logout(): Promise<void> {
  await destroySession();
  redirect("/ronan/login");
}
