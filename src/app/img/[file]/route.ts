import path from "node:path";
import type { NextRequest } from "next/server";
import { serveFile } from "@/lib/serve-file";

// Gallery photos, from public/gallery/ (see serve-file.ts for why not straight from public/).
const GALLERY = path.join(process.cwd(), "public", "gallery");

export async function GET(_req: NextRequest, ctx: RouteContext<"/img/[file]">) {
  const { file } = await ctx.params;
  return serveFile(GALLERY, file);
}
