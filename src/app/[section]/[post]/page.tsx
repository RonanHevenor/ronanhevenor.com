import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getPosts, getSections, type Post } from "@/lib/data";
import { SITE, bodyExcerpt } from "@/lib/seo";

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
