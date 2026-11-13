import { Marked } from "marked";
import { markedSmartypants } from "marked-smartypants";

// Dedicated instance so our renderer overrides don't leak to other consumers.
// We drop raw HTML tokens (both block and inline) so admin-entered markdown
// cannot inject <script>, <iframe>, event handlers, etc. Only the standard
// markdown features (paragraphs, emphasis, links, lists, code, headings) are
// rendered.
// An image may carry a size right after it: ![alt](src){210} makes it 210% of the text column's
// width (on wide screens; on phones every picture spans the screen).
const SIZED_IMAGE = /^!\[([^\]]*)\]\(\s*<?([^\s)>]+)>?(?:\s+"([^"]*)")?\s*\)\{\s*(\d{1,3})\s*%?\s*\}/;

// A line of its own like \space{2}{1} sets the gap there: 2 lines of text on wide screens, 1 on
// phones. Fractions work, and a negative number pulls things closer.
const NUM = String.raw`\s*(-?\d{1,2}(?:\.\d+)?)\s*`;
const SPACE = new RegExp(String.raw`^ {0,3}\\space\{${NUM}\}\{${NUM}\}[ \t]*(?:\n+|$)`);
const lines = (n: number) => Math.max(-20, Math.min(40, n));

const md = new Marked(markedSmartypants(), {
  extensions: [
    {
      name: "lineSpace",
      level: "block",
      start: (src: string) => {
        const m = /(^|\n) {0,3}\\space\{/.exec(src);
        return m ? m.index + m[1].length : undefined;
      },
      tokenizer(src: string) {
        const m = SPACE.exec(src);
        if (!m) return undefined;
        return { type: "lineSpace", raw: m[0], desktop: lines(Number(m[1])), mobile: lines(Number(m[2])) };
      },
      renderer(token) {
        const { desktop, mobile } = token as unknown as { desktop: number; mobile: number };
        return `<div class="md-space" style="--space:${desktop};--space-phone:${mobile}" aria-hidden="true"></div>\n`;
      },
    },
    {
      name: "sizedImage",
      level: "inline",
      start: (src: string) => src.indexOf("!["),
      tokenizer(src: string) {
        const m = SIZED_IMAGE.exec(src);
        if (!m) return undefined;
        return { type: "sizedImage", raw: m[0], text: m[1], href: m[2], title: m[3] ?? null, size: Number(m[4]) };
      },
      renderer(token) {
        const { href, text, title, size } = token as unknown as { href: string; text: string; title: string | null; size: number };
        const pct = Math.max(10, Math.min(400, size));
        return imageHtml(href, text, title, ` class="sized" style="--size:${pct / 100}"`);
      },
    },
  ],
}, {
  gfm: true,
  breaks: true,
  renderer: {
    html: () => "",
    // Images (e.g. pictures pasted into a project write-up): only site paths or http(s) URLs.
    image({ href, title, text }) {
      return imageHtml(href, text, title);
    },
    link({ href, title, tokens }) {
      const text = this.parser.parseInline(tokens);
      const safeHref = typeof href === "string" && isSafeUrl(href) ? href : "";
      const titleAttr = title ? ` title="${escapeAttr(title)}"` : "";
      return `<a href="${escapeAttr(safeHref)}"${titleAttr} target="_blank" rel="noopener noreferrer">${text}</a>`;
    },
  },
});

// The size an image is given when it's added to a write-up: as wide as it shows without one
// (its own width, up to 64rem) as a share of the text column (624px of text on a wide screen).
export function defaultImageSize(widthPx: number): number {
  return Math.max(10, Math.round((Math.min(widthPx, 1024) / 624) * 100));
}

function imageHtml(href: unknown, text: string, title: string | null | undefined, extra = ""): string {
  if (typeof href !== "string" || !isSafeUrl(href)) return escapeAttr(text);
  const titleAttr = title ? ` title="${escapeAttr(title)}"` : "";
  return `<img src="${escapeAttr(href)}" alt="${escapeAttr(text)}"${titleAttr}${extra} loading="lazy">`;
}

// Web links, mail links, and paths on this site; never javascript:, data: and the like.
function isSafeUrl(url: string): boolean {
  const u = url.trim().toLowerCase();
  return /^(https?:|mailto:)/.test(u) || /^[/#?]/.test(u) || !/^[a-z][a-z0-9+.-]*:/.test(u);
}

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
