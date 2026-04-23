import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import { login } from "./actions";

export const dynamic = "force-dynamic";

function safeTarget(to: string | undefined): string {
  if (!to) return "/ronan";
  if (to.startsWith("//") || to.startsWith("/\\")) return "/ronan";
  if (!to.startsWith("/ronan")) return "/ronan";
  if (to === "/ronan/login" || to.startsWith("/ronan/login/")) return "/ronan";
  return to;
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ to?: string; err?: string }>;
}) {
  const { to, err } = await searchParams;
  const target = safeTarget(to);
  if (await isAuthenticated()) {
    redirect(target);
  }
  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <form
        action={login}
        className="w-full max-w-sm space-y-4 border border-neutral-300 dark:border-neutral-700 p-6"
      >
        <h1 className="text-xl font-semibold tracking-tight">sign in</h1>
        <input type="hidden" name="to" value={target} />
        <input
          name="password"
          type="password"
          required
          autoFocus
          autoComplete="current-password"
          placeholder="password"
          className="w-full border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2 text-sm"
        />
        {err && (
          <p className="text-sm text-red-600">{err}</p>
        )}
        <button
          type="submit"
          className="w-full px-4 py-2 bg-black text-white text-sm dark:bg-white dark:text-black"
        >
          sign in
        </button>
      </form>
    </div>
  );
}
