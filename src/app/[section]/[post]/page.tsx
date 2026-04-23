import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getPosts, getSections } from "@/lib/data";

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

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { section, post } = await params;
  const res = await resolveBlogSection(section);
  if (res.kind === "missing") return { title: "Ronan Hevenor" };
  const posts = await getPosts();
  const p = posts.find((x) => x.slug === post);
  return { title: p ? `${p.title} — Ronan Hevenor` : "Ronan Hevenor" };
}

export default async function Page({
  params,
}: {
  params: Promise<Params>;
}) {
  const { section, post } = await params;
  const res = await resolveBlogSection(section);
  if (res.kind === "missing") notFound();
  const posts = await getPosts();
  if (!posts.find((p) => p.slug === post)) notFound();
  if (res.kind === "redirect") redirect(`/${res.blog.slug}/${post}`);
  return null;
}
