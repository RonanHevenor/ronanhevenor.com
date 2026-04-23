import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPosts } from "@/lib/data";

type Params = { slug: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const posts = await getPosts();
  const post = posts.find((p) => p.slug === slug);
  return { title: post ? `${post.title} — Ronan Hevenor` : "Ronan Hevenor" };
}

export default async function Page({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const posts = await getPosts();
  if (!posts.find((p) => p.slug === slug)) notFound();
  return null;
}
