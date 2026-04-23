import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSections } from "@/lib/data";

type Params = { section: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { section } = await params;
  const { quadrants } = await getSections();
  const q = quadrants.find((x) => x.slug === section);
  return { title: q ? `${q.title} — Ronan Hevenor` : "Ronan Hevenor" };
}

export default async function Page({
  params,
}: {
  params: Promise<Params>;
}) {
  const { section } = await params;
  const { quadrants } = await getSections();
  if (!quadrants.find((q) => q.slug === section)) notFound();
  return null;
}
