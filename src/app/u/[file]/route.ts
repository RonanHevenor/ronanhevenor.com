import type { NextRequest } from "next/server";
import { UPLOADS_DIR } from "@/lib/data";
import { serveFile } from "@/lib/serve-file";

// Project images uploaded in the admin (logos, title images, pictures in write-ups), from
// public/uploads/ (see serve-file.ts for why not straight from public/).
export async function GET(_req: NextRequest, ctx: RouteContext<"/u/[file]">) {
  const { file } = await ctx.params;
  return serveFile(UPLOADS_DIR, file);
}
