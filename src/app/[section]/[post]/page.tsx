import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getPosts, getSections, type Post } from "@/lib/data";

type Params = { section: string; post: string };

async function resolveBlogSection(section: string) {
  const { quadrants } = await getSections();
  const blog = quadrants[3];
  if (!blog) return { kind: "missing" as const };
  if (section === blog.slug) return { kind: "current" as const, blog };
  if ((blog.pastSlugs ?? []).includes(section)) {
    return { kind: "redirect" as const, blog };
  }
  return { kind: "missing" as const };
}

function findPost(posts: Post[], slug: string) {
  const current = posts.find((p) => p.slug === slug);
  if (current) return { kind: "current" as const, post: current };
  const historic = posts.find((p) => (p.pastSlugs ?? []).includes(slug));
  if (historic) return { kind: "redirect" as const, post: historic };
  return { kind: "missing" as const };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { section, post } = await params;
  const sec = await resolveBlogSection(section);
  if (sec.kind === "missing") return { title: "Ronan Hevenor" };
  const posts = await getPosts();
  const res = findPost(posts, post);
  if (res.kind === "missing") return { title: "Ronan Hevenor" };
  return { title: `${res.post.title} — Ronan Hevenor` };
}

export default async function Page({
  params,
}: {
  params: Promise<Params>;
}) {
  const { section, post } = await params;
  const sec = await resolveBlogSection(section);
  if (sec.kind === "missing") notFound();
  const posts = await getPosts();
  const res = findPost(posts, post);
  if (res.kind === "missing") notFound();
  if (sec.kind === "redirect" || res.kind === "redirect") {
    redirect(`/${sec.blog.slug}/${res.post.slug}`);
  }
  return null;
}
