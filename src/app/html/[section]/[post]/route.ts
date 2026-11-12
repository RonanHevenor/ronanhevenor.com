import type { NextRequest } from "next/server";
import { getPosts, getProjects, getSections } from "@/lib/data";
import { renderMarkdown } from "@/lib/markdown";
import { SITE } from "@/lib/seo";
import { esc, notFound, page } from "../../html";

// /html/<thoughts section>/<post>: one post as a plain HTML page, and
// /html/<what i do section>/<project>: one project's page. "<-Back" returns to the list.

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, ctx: RouteContext<"/html/[section]/[post]">) {
  const { section, post: slug } = await ctx.params;
  const [sections, posts] = await Promise.all([getSections(), getPosts()]);
  const work = sections.quadrants[1];
  if (section === work.slug) {
    const project = (await getProjects()).find((p) => p.slug === slug);
    if (!project) return notFound();
    const links = [
      project.repo ? `<a href="https://github.com/${esc(project.repo)}">Code on GitHub</a>` : "",
      project.href ? `<a href="${esc(project.href)}">Live site</a>` : "",
    ].filter(Boolean).join(" | ");
    const t = project.titleImage;
    const h = Math.round((Math.min(480, t.w) * t.h) / t.w);
    return page({
      title: `${project.title} — ${SITE.title}`,
      path: `/html/${work.slug}/${project.slug}`,
      back: `/html/${work.slug}`,
      body: `<article>
<h1><img src="${esc(t.src)}" width="${Math.min(480, t.w)}" height="${h}" alt="${esc(project.title)}"></h1>
${links ? `<p>${links}</p>` : ""}
${project.body ? renderMarkdown(project.body) : "<p>Nothing written about this one yet.</p>"}
</article>`,
    });
  }
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
