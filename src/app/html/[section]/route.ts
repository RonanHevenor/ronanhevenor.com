import type { NextRequest } from "next/server";
import { getPhotos, getPosts, getProjects, getSections } from "@/lib/data";
import { renderMarkdown } from "@/lib/markdown";
import { SITE } from "@/lib/seo";
import { esc, notFound, page } from "../html";

// /html/<section>: one of the four sections as a plain HTML page. The slugs are the quadrants'
// own (whatever they're set to in the admin), in the same order as the main site's quadrants:
// photographs, what I do, who I am, thoughts.

export const dynamic = "force-dynamic";

// A gallery photo through Next's resizer, so the page doesn't load full-size originals.
function photoUrl(src: string, w: number): string {
  return `/_next/image?url=${encodeURIComponent(`/img/${src}`)}&w=${w}&q=75`;
}

export async function GET(_req: NextRequest, ctx: RouteContext<"/html/[section]">) {
  const { section } = await ctx.params;
  const sections = await getSections();
  const index = sections.quadrants.findIndex((q) => q.slug === section);
  if (index === -1) return notFound();
  const q = sections.quadrants[index];

  let body: string;
  if (index === 0) {
    const photos = await getPhotos();
    body = photos.length
      ? `<ul>\n${photos
          .map((p, i) => {
            const h = Math.round((540 * p.h) / p.w);
            return `<li><a href="/img/${esc(p.src)}"><img src="${photoUrl(p.src, 1080)}" width="540" height="${h}" alt="Photograph by Ronan Hevenor, ${i + 1} of ${photos.length}" loading="lazy"></a></li>`;
          })
          .join("\n")}\n</ul>`
      : "<p>No photographs yet.</p>";
  } else if (index === 1) {
    // the projects, each linking to its own page
    const projects = (await getProjects())
      .map((p) => {
        const h = Math.round((240 * p.logo.h) / p.logo.w);
        return `<li>\n<h2><a href="/html/${esc(q.slug)}/${esc(p.slug)}">${esc(p.title)}</a></h2>\n<p><img src="${esc(p.logo.src)}" width="240" height="${h}" alt="${esc(p.logoAlt)}"></p>\n</li>`;
      })
      .join("\n");
    body = `${renderMarkdown(sections.whatido)}\n<ul>\n${projects}\n</ul>`;
  } else if (index === 2) {
    body = `<p><img src="/headshot.jpg" width="240" height="320" alt="Ronan Hevenor, smiling, in a green shirt with pine trees behind him"></p>\n${renderMarkdown(sections.whoiam)}`;
  } else {
    const posts = await getPosts();
    body = posts.length
      ? `<ul>\n${posts
          .map(
            (p) =>
              `<li><a href="/html/${esc(q.slug)}/${esc(p.slug)}">${esc(p.title)}</a> (<time datetime="${esc(p.date)}">${esc(p.date)}</time>)</li>`,
          )
          .join("\n")}\n</ul>`
      : "<p>No posts yet.</p>";
  }

  return page({
    title: `${q.title} — ${SITE.title}`,
    path: `/html/${q.slug}`,
    back: "/html",
    body: `<h1>${esc(q.title)}</h1>\n${body}`,
  });
}
