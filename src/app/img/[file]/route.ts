import fs from "node:fs/promises";
import path from "node:path";
import type { NextRequest } from "next/server";

// Serves gallery photos from public/gallery/ on every request.
//
// `next start` only serves files that were in public/ when the server
// started, so photos uploaded through /ronan afterwards would 404 until the
// next restart. Reading from disk here makes new uploads show up at once.

const GALLERY = path.join(process.cwd(), "public", "gallery");

const TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

export async function GET(_req: NextRequest, ctx: RouteContext<"/img/[file]">) {
  const { file } = await ctx.params;
  // Same character set the upload action writes; rules out "..", slashes, etc.
  if (!/^[A-Za-z0-9._-]+$/.test(file) || file.startsWith(".")) {
    return new Response("not found", { status: 404 });
  }
  const type = TYPES[path.extname(file).toLowerCase()];
  if (!type) return new Response("not found", { status: 404 });

  try {
    const buf = await fs.readFile(path.join(GALLERY, file));
    return new Response(new Uint8Array(buf), {
      headers: {
        "Content-Type": type,
        // A deleted photo's name can be reused by a later upload, so cache
        // for a day rather than forever.
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch {
    return new Response("not found", { status: 404 });
  }
}
