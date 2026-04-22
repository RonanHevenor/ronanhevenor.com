@AGENTS.md

# Site Architecture

Personal portfolio site for Ronan Hevenor. Built with Next.js App Router, React 19, TypeScript, and Tailwind CSS 4.

## How the UI Works

All visible content is rendered by **`src/app/_components/Surface.tsx`** — a single client component that displays a 2×2 grid of interactive quadrants. Each quadrant expands to fullscreen on click and collapses on Escape or clicking again.

Page files (`src/app/whoiam/page.tsx`, etc.) all return `null`. They exist only for metadata (title tags) and route existence. **Never put content in page files** — it goes in the `quadrants` array in `Surface.tsx`.

The one exception: blog post content lives in `Surface.tsx` as a named const (e.g. `loremPost`) and is conditionally rendered when `pathname` matches the post route.

## Quadrants (in order, index 0–3)

| # | Title | Path | bg / fg |
|---|-------|------|---------|
| 0 | What I see | `/whatisee` | `bg-white` / `text-neutral-900` |
| 1 | What I do | `/whatido` | `bg-neutral-200` / `text-neutral-900` |
| 2 | Who I am | `/whoiam` | `bg-neutral-700` / `text-neutral-100` |
| 3 | My thoughts | `/mythoughts` | `bg-black` / `text-neutral-100` |

## Gallery

Images live in `public/gallery/`. Referenced by filename in the `photos` array at the top of `Surface.tsx`. Two sets: personal photos (`RonanHevenor-XX.jpg`) and drone shots (`2002-kingston-droneshot-XX.jpg`).

## Blog Posts

Add a new post by:
1. Creating `src/app/mythoughts/<slug>/page.tsx` (with metadata, returning `null`)
2. Adding a `const` for the post JSX in `Surface.tsx`
3. Adding the conditional render in the body div: `i === 3 && pathname === "/mythoughts/<slug>" ? <postConst> : q.body`
4. Adding a `<li>` link in the "My thoughts" quadrant body

## Styling

- Tailwind CSS 4 (import via `@import "tailwindcss"` — no `tailwind.config.js`)
- Body font: Geist Sans; mono font: Geist Mono (loaded in `layout.tsx`)
- Dark mode via `prefers-color-scheme` in `globals.css`
- Animation: `fade-up` keyframe defined in `globals.css`
