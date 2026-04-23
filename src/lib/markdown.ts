import { Marked } from "marked";
import { markedSmartypants } from "marked-smartypants";

// Dedicated instance so our renderer overrides don't leak to other consumers.
// We drop raw HTML tokens (both block and inline) so admin-entered markdown
// cannot inject <script>, <iframe>, event handlers, etc. Only the standard
// markdown features (paragraphs, emphasis, links, lists, code, headings) are
// rendered.
const md = new Marked(markedSmartypants(), {
  gfm: true,
  breaks: true,
  renderer: {
    html: () => "",
    link({ href, title, tokens }) {
      const text = this.parser.parseInline(tokens);
      const safeHref = typeof href === "string" ? href : "";
      const titleAttr = title ? ` title="${escapeAttr(title)}"` : "";
      return `<a href="${escapeAttr(safeHref)}"${titleAttr} target="_blank" rel="noopener noreferrer">${text}</a>`;
    },
  },
});

function escapeAttr(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function renderMarkdown(src: string): string {
  if (!src) return "";
  return md.parse(src, { async: false }) as string;
}
