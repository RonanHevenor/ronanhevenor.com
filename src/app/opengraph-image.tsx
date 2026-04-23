import { ImageResponse } from "next/og";
import { SITE } from "@/lib/seo";

export const runtime = "nodejs";
export const alt = SITE.title;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
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
          justifyContent: "center",
          padding: "80px",
          fontFamily: "serif",
        }}
      >
        <div style={{ fontSize: 96, fontWeight: 500, letterSpacing: "-0.02em" }}>
          {SITE.title}
        </div>
        <div
          style={{
            fontSize: 36,
            marginTop: 28,
            color: "#a3a3a3",
            maxWidth: 900,
            lineHeight: 1.3,
          }}
        >
          {SITE.description}
        </div>
      </div>
    ),
    { ...size },
  );
}
