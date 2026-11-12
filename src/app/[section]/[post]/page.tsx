import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getPosts, getProjects, getSections, type Post } from "@/lib/data";
import { SITE, bodyExcerpt } from "@/lib/seo";

type Params = { section: string; post: string };

// /<what i do>/<project>: a project's page (shown by Surface inside the "What I do" quadrant).
async function findProject(section: string, slug: string) {
  const { quadrants } = await getSections();
  const work = quadrants[1];
  if (!work || section !== work.slug) return null;
  const project = (await getProjects()).find((p) => p.slug === slug);
  return project ? { work, project } : "missing";
}

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
  const proj = await findProject(section, post);
  if (proj === "missing") return { title: SITE.title };
  if (proj) {
    const description = proj.project.body ? bodyExcerpt(proj.project.body) : `${proj.project.title}, by ${SITE.author}.`;
    const canonical = `/${proj.work.slug}/${proj.project.slug}`;
    return {
      title: proj.project.title,
      description,
      alternates: { canonical },
      openGraph: { type: "article", url: `${SITE.url}${canonical}`, title: `${proj.project.title} — ${SITE.title}`, description, siteName: SITE.title },
    };
  }
  const sec = await resolveBlogSection(section);
  if (sec.kind === "missing") return { title: SITE.title };
  const posts = await getPosts();
  const res = findPost(posts, post);
  if (res.kind === "missing") return { title: SITE.title };
  const description = bodyExcerpt(res.post.body);
  const canonical = `/${sec.blog.slug}/${res.post.slug}`;
  return {
    title: res.post.title,
    description,
    alternates: { canonical },
    authors: [{ name: SITE.author, url: SITE.url }],
    openGraph: {
      type: "article",
      url: `${SITE.url}${canonical}`,
      title: `${res.post.title} — ${SITE.title}`,
      description,
      siteName: SITE.title,
      publishedTime: res.post.date,
      authors: [SITE.author],
    },
    twitter: {
      card: "summary_large_image",
      title: `${res.post.title} — ${SITE.title}`,
      description,
    },
  };
}

export default async function Page({
  params,
}: {
  params: Promise<Params>;
}) {
  const { section, post } = await params;
  const proj = await findProject(section, post);
  if (proj === "missing") notFound();
  if (proj) return null; // Surface shows the project; this route only supplies metadata
  const sec = await resolveBlogSection(section);
  if (sec.kind === "missing") notFound();
  const posts = await getPosts();
  const res = findPost(posts, post);
  if (res.kind === "missing") notFound();
  if (sec.kind === "redirect" || res.kind === "redirect") {
    redirect(`/${sec.blog.slug}/${res.post.slug}`);
  }

  const canonical = `${SITE.url}/${sec.blog.slug}/${res.post.slug}`;
  const articleLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: res.post.title,
    description: bodyExcerpt(res.post.body),
    datePublished: res.post.date,
    dateModified: res.post.date,
    author: { "@type": "Person", name: SITE.author, url: SITE.url },
    publisher: { "@type": "Person", name: SITE.author, url: SITE.url },
    mainEntityOfPage: { "@type": "WebPage", "@id": canonical },
    url: canonical,
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(articleLd) }}
    />
  );
}
