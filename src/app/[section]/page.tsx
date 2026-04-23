import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getSections } from "@/lib/data";

type Params = { section: string };

async function resolveSection(section: string) {
  const { quadrants } = await getSections();
  const current = quadrants.find((q) => q.slug === section);
  if (current) return { kind: "current" as const, quadrant: current };
  const historic = quadrants.find((q) =>
    (q.pastSlugs ?? []).includes(section),
  );
  if (historic) return { kind: "redirect" as const, quadrant: historic };
  return { kind: "missing" as const };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { section } = await params;
  const res = await resolveSection(section);
  if (res.kind === "missing") return { title: "Ronan Hevenor" };
  return { title: `${res.quadrant.title} — Ronan Hevenor` };
}

export default async function Page({
  params,
}: {
  params: Promise<Params>;
}) {
  const { section } = await params;
  const res = await resolveSection(section);
  if (res.kind === "missing") notFound();
  if (res.kind === "redirect") redirect(`/${res.quadrant.slug}`);
  return null;
}
