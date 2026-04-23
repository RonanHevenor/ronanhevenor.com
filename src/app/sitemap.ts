import type { MetadataRoute } from "next";
import { getPosts, getSections } from "@/lib/data";
import { SITE } from "@/lib/seo";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [{ quadrants }, posts] = await Promise.all([
    getSections(),
    getPosts(),
  ]);
  const now = new Date();

  const entries: MetadataRoute.Sitemap = [
    {
      url: SITE.url + "/",
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
  ];

  for (const q of quadrants) {
    entries.push({
      url: `${SITE.url}/${q.slug}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7,
    });
  }

  const blogSlug = quadrants[3]?.slug;
  if (blogSlug) {
    for (const p of posts) {
      entries.push({
        url: `${SITE.url}/${blogSlug}/${p.slug}`,
        lastModified: p.date ? new Date(p.date) : now,
        changeFrequency: "yearly",
        priority: 0.6,
      });
    }
  }

  return entries;
}
