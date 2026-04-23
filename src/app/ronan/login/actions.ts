"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  checkRateLimit,
  clearRateLimit,
  createSession,
  verifyPassword,
} from "@/lib/auth";

function safeTarget(to: string): string {
  if (!to) return "/ronan";
  if (to.startsWith("//") || to.startsWith("/\\")) return "/ronan";
  if (!to.startsWith("/ronan")) return "/ronan";
  if (to === "/ronan/login" || to.startsWith("/ronan/login/")) return "/ronan";
  return to;
}

export async function login(formData: FormData): Promise<void> {
  const password = String(formData.get("password") || "");
  const to = safeTarget(String(formData.get("to") || "/ronan"));

  const h = await headers();
  const ip =
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    "unknown";

  const rate = checkRateLimit(`login:${ip}`);
  if (!rate.ok) {
    const minutes = Math.ceil(rate.remainingMs / 60000);
    redirect(
      `/ronan/login?to=${encodeURIComponent(to)}&err=${encodeURIComponent(
        `too many attempts — try again in ${minutes} min`,
      )}`,
    );
  }

  if (!verifyPassword(password)) {
    redirect(
      `/ronan/login?to=${encodeURIComponent(to)}&err=${encodeURIComponent(
        "invalid password",
      )}`,
    );
  }

  clearRateLimit(`login:${ip}`);
  await createSession();
  redirect(to);
}
