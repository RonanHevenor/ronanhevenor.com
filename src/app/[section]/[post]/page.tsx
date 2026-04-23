import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPosts, getSections } from "@/lib/data";

type Params = { section: string; post: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { section, post } = await params;
  const { quadrants } = await getSections();
  const blogSlug = quadrants[3].slug;
  if (section !== blogSlug) return { title: "Ronan Hevenor" };
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
  const { quadrants } = await getSections();
  const blogSlug = quadrants[3].slug;
  if (section !== blogSlug) notFound();
  const posts = await getPosts();
  if (!posts.find((p) => p.slug === post)) notFound();
  return null;
}
