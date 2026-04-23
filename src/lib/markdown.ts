import { Marked } from "marked";

// Dedicated instance so our renderer overrides don't leak to other consumers.
// We drop raw HTML tokens (both block and inline) so admin-entered markdown
// cannot inject <script>, <iframe>, event handlers, etc. Only the standard
// markdown features (paragraphs, emphasis, links, lists, code, headings) are
// rendered.
const md = new Marked({
  gfm: true,
  breaks: true,
  renderer: {
    html: () => "",
  },
});

export function renderMarkdown(src: string): string {
  if (!src) return "";
  return md.parse(src, { async: false }) as string;
}
