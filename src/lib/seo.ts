export const SITE = {
  title: "Ronan Hevenor",
  description:
    "The writing, photography, and work of Ronan Hevenor — builder, writer, visual artist.",
  url: "https://ronanhevenor.com",
  author: "Ronan Hevenor",
  locale: "en_US",
};

// Turn markdown / post body into a plain-text snippet for meta descriptions.
export function bodyExcerpt(src: string, max = 160): string {
  const text = src
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]*`/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[#>*_~\-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > 40 ? cut.slice(0, lastSpace) : cut).trimEnd() + "…";
}
