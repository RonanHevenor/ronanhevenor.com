import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getSections } from "@/lib/data";
import { SITE, bodyExcerpt } from "@/lib/seo";

type Params = { section: string };

async function resolveSection(section: string) {
  const sections = await getSections();
  const current = sections.quadrants.find((q) => q.slug === section);
  if (current) {
    return { kind: "current" as const, quadrant: current, sections };
  }
  const historicIdx = sections.quadrants.findIndex((q) =>
    (q.pastSlugs ?? []).includes(section),
  );
  if (historicIdx !== -1) {
    return {
      kind: "redirect" as const,
      quadrant: sections.quadrants[historicIdx],
      sections,
    };
  }
  return { kind: "missing" as const };
}

function descriptionFor(
  idx: number,
  sections: Awaited<ReturnType<typeof getSections>>,
  quadrantTitle: string,
): string {
  if (idx === 1 && sections.whatido)
    return bodyExcerpt(sections.whatido);
  if (idx === 2 && sections.whoiam)
    return bodyExcerpt(sections.whoiam);
  return `${quadrantTitle} — ${SITE.description}`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { section } = await params;
  const res = await resolveSection(section);
  if (res.kind === "missing") return { title: SITE.title };
  const idx = res.sections.quadrants.findIndex(
    (q) => q.slug === res.quadrant.slug,
  );
  const description = descriptionFor(idx, res.sections, res.quadrant.title);
  const canonical = `/${res.quadrant.slug}`;
  return {
    title: res.quadrant.title,
    description,
    alternates: { canonical },
    openGraph: {
      type: "website",
      url: `${SITE.url}${canonical}`,
      title: `${res.quadrant.title} — ${SITE.title}`,
      description,
      siteName: SITE.title,
    },
    twitter: {
      card: "summary_large_image",
      title: `${res.quadrant.title} — ${SITE.title}`,
      description,
    },
  };
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
