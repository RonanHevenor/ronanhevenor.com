import type { NextRequest } from "next/server";
import { getPosts, getSections } from "@/lib/data";
import { renderMarkdown } from "@/lib/markdown";
import { SITE } from "@/lib/seo";
import { esc, notFound, page } from "../../html";

// /html/<thoughts section>/<post>: one post as a plain HTML page; "<-Back" returns to the list.

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, ctx: RouteContext<"/html/[section]/[post]">) {
  const { section, post: slug } = await ctx.params;
  const [sections, posts] = await Promise.all([getSections(), getPosts()]);
  const thoughts = sections.quadrants[3];
  if (section !== thoughts.slug) return notFound();
  const post = posts.find((p) => p.slug === slug || p.pastSlugs?.includes(slug));
  if (!post) return notFound();

  return page({
    title: `${post.title} — ${SITE.title}`,
    path: `/html/${thoughts.slug}/${post.slug}`,
    back: `/html/${thoughts.slug}`,
    body: `<article>
<h1>${esc(post.title)}</h1>
<p><time datetime="${esc(post.date)}">${esc(post.date)}</time></p>
${renderMarkdown(post.body)}
</article>`,
  });
}
