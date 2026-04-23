import { ImageResponse } from "next/og";
import { notFound } from "next/navigation";
import { getPosts, getSections } from "@/lib/data";
import { SITE, bodyExcerpt } from "@/lib/seo";

export const runtime = "nodejs";
export const alt = "Blog post";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

type Params = { section: string; post: string };

export default async function Image({ params }: { params: Params }) {
  const { section, post } = params;
  const { quadrants } = await getSections();
  const blog = quadrants[3];
  if (!blog || (section !== blog.slug && !(blog.pastSlugs ?? []).includes(section))) {
    notFound();
  }
  const posts = await getPosts();
  const p =
    posts.find((x) => x.slug === post) ||
    posts.find((x) => (x.pastSlugs ?? []).includes(post));
  if (!p) notFound();

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#171717",
          color: "#f5f5f5",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "80px",
          fontFamily: "serif",
        }}
      >
        <div
          style={{
            fontSize: 72,
            fontWeight: 500,
            letterSpacing: "-0.02em",
            lineHeight: 1.15,
          }}
        >
          {p.title}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ fontSize: 28, color: "#a3a3a3", maxWidth: 1040, lineHeight: 1.35 }}>
            {bodyExcerpt(p.body, 200)}
          </div>
          <div style={{ fontSize: 22, color: "#737373" }}>
            {p.date} · {SITE.title}
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
