import { SITE } from "@/lib/seo";

// Shared pieces of the plain, old-school HTML version of the site (/html): no stylesheet, no
// scripts, the browser's own defaults (Times, blue underlined links, bullets). Its pages are
// route handlers, not React pages, so the site's layout, CSS reset and animated quadrants
// don't apply.

export function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// A complete page. Every page starts with a "<-Back" link one level up.
export function page({
  title,
  path,
  back,
  body,
  status = 200,
}: {
  title: string; // for <title>; the page's own <h1> is in `body`
  path: string; // this page's path, for the canonical link
  back: string; // where "<-Back" goes
  body: string;
  status?: number;
}): Response {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(SITE.description)}">
<link rel="canonical" href="${esc(SITE.url + path)}">
</head>
<body>
<p><a href="${esc(back)}">&lt;-Back</a></p>
${body}
</body>
</html>
`;
  return new Response(html, { status, headers: { "Content-Type": "text/html; charset=utf-8" } });
}

export function notFound(): Response {
  return page({
    title: `Not found — ${SITE.title}`,
    path: "/html",
    back: "/html",
    body: "<h1>Not found</h1>\n<p>There's no page here.</p>",
    status: 404,
  });
}
