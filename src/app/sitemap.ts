import type { MetadataRoute } from "next";
import { getPosts, getProjects, getSections } from "@/lib/data";
import { SITE } from "@/lib/seo";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [{ quadrants }, posts, projects] = await Promise.all([
    getSections(),
    getPosts(),
    getProjects(),
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

  const workSlug = quadrants[1]?.slug;
  if (workSlug) {
    for (const p of projects) {
      entries.push({
        url: `${SITE.url}/${workSlug}/${p.slug}`,
        lastModified: now,
        changeFrequency: "monthly",
        priority: 0.6,
      });
    }
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
