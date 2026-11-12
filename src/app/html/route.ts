import { getSections } from "@/lib/data";
import { SITE } from "@/lib/seo";
import { esc, page } from "./html";

// /html: the plain version's front page. A heading and the four sections as a bulleted list.
// Linked from the bottom of the main site ("Make this site less pretty (yet more accessible)").

export const dynamic = "force-dynamic";

export async function GET() {
  const { quadrants } = await getSections();
  const items = quadrants
    .map((q) => `<li><a href="/html/${esc(q.slug)}">${esc(q.title)}</a></li>`)
    .join("\n");
  return page({
    title: SITE.title,
    path: "/html",
    back: "/",
    body: `<h1>Ronan Hevenor's Personal Website</h1>
<nav aria-label="Sections">
<ul>
${items}
</ul>
</nav>`,
  });
}
