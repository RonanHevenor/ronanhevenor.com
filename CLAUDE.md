@AGENTS.md

# Site Architecture

Personal portfolio site for Ronan Hevenor. Next.js 16 App Router, React 19, TypeScript, Tailwind v4.

## How the UI Works

All visible content is rendered by `src/app/_components/Surface.tsx` — a client component that displays a 2×2 grid of interactive quadrants. Each quadrant expands to fullscreen on click and collapses on Escape. The "What I see" quadrant is non-clickable and instead resizes on hover to match the active photo's aspect ratio.

Page files (`src/app/whoiam/page.tsx`, etc.) return `null`. They exist only for metadata/title tags. **Do not put content in page files.** Content is either hardcoded in `Surface.tsx` (structural bits like quadrant titles) or flows in from data files (see below).

Surface returns `null` on `/ronan` paths so the admin UI has the body to itself.

## Quadrants (index 0–3)

| # | Title | Path | Source of body |
|---|-------|------|----------------|
| 0 | What I see | `/whatisee` | `<Slideshow>` over `data/photos.json` |
| 1 | What I do | `/whatido` | Markdown in `data/sections.json` → `whatido` |
| 2 | Who I am | `/whoiam` | Markdown in `data/sections.json` → `whoiam` |
| 3 | My thoughts | `/mythoughts` | List from `data/posts.json`; body for `/mythoughts/[slug]` rendered from that post's markdown |

## Data layer

- `data/photos.json` — array of `{src, w, h}`. Image files live in `public/gallery/`.
- `data/posts.json` — array of `{slug, title, date, body}` where body is markdown.
- `data/sections.json` — `{whatido, whoiam}` each markdown.
- All three files **and** `public/gallery/` are gitignored. The repo ships empty of user content; real content is seeded on the deployed server via the admin.

`src/lib/data.ts` wraps read/write of those files. `src/lib/markdown.ts` parses markdown and drops raw-HTML tokens so the rendered output is safe to inject. `src/app/layout.tsx` reads data server-side each request (layout is `force-dynamic`) and passes pre-rendered HTML into `Surface`.

## Admin at `/ronan`

Three tabs: **photos** (multi-upload, grid w/ delete), **posts** (markdown body), **sections** (markdown for What I do / Who I am). Mutations go through server actions in `src/app/ronan/actions.ts`; each calls `requireAuth()` and `revalidatePath("/", "layout")` so the public site reflects changes immediately.

## Auth (`/ronan` only)

- PBKDF2-SHA256 password (600k iters) hashed into `ADMIN_PASSWORD_HASH`.
- HMAC-signed session cookie (`ronan_session`) signed with `AUTH_SECRET`. HttpOnly, SameSite=Strict, Secure in prod, 7-day expiry.
- `src/proxy.ts` (Next 16 Proxy / formerly Middleware) verifies the cookie on every `/ronan/*` request except `/ronan/login`. Fails closed (503) without `AUTH_SECRET`.
- Defense in depth: every server action additionally calls `requireAuth()`.
- Login form rate-limits by client IP (5 attempts / 15 min), in-memory.

Both env vars must be set. See `.env.example` for the generation one-liners.

## Deployment

See **[DEPLOY.md](./DEPLOY.md)** for a complete VPS walkthrough (systemd, Caddy/nginx reverse proxy, backups, update flow, password rotation).

## Styling

- Tailwind v4 imported via `@import "tailwindcss"` in `globals.css` — no `tailwind.config.js`.
- Markdown output is styled via `.markdown` selectors in `globals.css`.
- Fonts: Geist Sans / Geist Mono from `next/font/google`, wired in `layout.tsx`.
- Dark mode via `prefers-color-scheme`.
