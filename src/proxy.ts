import crypto from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";

const COOKIE_NAME = "ronan_session";
const HASH_ALGO = "sha256";

function getSecret(): Buffer | null {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 64) return null;
  try {
    return Buffer.from(s, "hex");
  } catch {
    return null;
  }
}

function verifyToken(token: string, secret: Buffer): boolean {
  const dot = token.indexOf(".");
  if (dot === -1) return false;
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = crypto
    .createHmac(HASH_ALGO, secret)
    .update(body)
    .digest("base64url");
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length) return false;
  if (!crypto.timingSafeEqual(sigBuf, expBuf)) return false;
  try {
    const payload = JSON.parse(
      Buffer.from(body, "base64url").toString("utf-8"),
    );
    return typeof payload.exp === "number" && payload.exp > Date.now();
  } catch {
    return false;
  }
}

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname === "/ronan/login" || pathname.startsWith("/ronan/login/")) {
    return NextResponse.next();
  }

  const secret = getSecret();
  if (!secret) {
    return new NextResponse(
      "admin unavailable: AUTH_SECRET not configured (need 64+ hex chars)",
      { status: 503 },
    );
  }

  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token || !verifyToken(token, secret)) {
    const url = req.nextUrl.clone();
    url.pathname = "/ronan/login";
    url.searchParams.set("to", pathname + req.nextUrl.search);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/ronan", "/ronan/:path*"],
};
