"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { Photo } from "@/lib/data";

type SurfacePost = { slug: string; title: string; date: string; html: string };
type SurfaceQuadrant = { title: string; slug: string };
type SurfaceSections = {
  whatido: string;
  whoiam: string;
  quadrants: SurfaceQuadrant[];
};

const SLIDE_INTERVAL_MS = 5000;
const SLIDE_FADE_MS = 700;

const BIG = "55%";
const HALF = "50%";

const HOVER_MS = 380;
const EXPAND_MS = 750;
const TEXT_FADE_MS = 180;
const TEXT_CHAR_STEP_MS = 25;

function Slideshow({
  photos,
  onActivePhotoChange,
  dim,
}: {
  photos: Photo[];
  onActivePhotoChange?: (photo: Photo) => void;
  dim: boolean;
}) {
  const [a, setA] = useState(0);
  const [b, setB] = useState(1 % Math.max(photos.length, 1));
  const [aActive, setAActive] = useState(true);
  const tickRef = useRef(0);

  useEffect(() => {
    if (photos.length < 2) return;
    const id = setInterval(() => {
      tickRef.current += 1;
      if (tickRef.current % 2 === 1) {
        setAActive(false);
        setTimeout(() => {
          setA((prev) => (prev + 2) % photos.length);
        }, SLIDE_FADE_MS + 100);
      } else {
        setAActive(true);
        setTimeout(() => {
          setB((prev) => (prev + 2) % photos.length);
        }, SLIDE_FADE_MS + 100);
      }
    }, SLIDE_INTERVAL_MS);
    return () => clearInterval(id);
  }, [photos.length]);

  const activePhoto = photos[aActive ? a : b];
  const lastReportedRef = useRef<Photo | null>(null);
  useEffect(() => {
    if (!activePhoto) return;
    if (lastReportedRef.current !== activePhoto) {
      lastReportedRef.current = activePhoto;
      onActivePhotoChange?.(activePhoto);
    }
  }, [activePhoto, onActivePhotoChange]);

  const fade = `opacity ${SLIDE_FADE_MS}ms ease-in-out`;

  if (photos.length === 0) {
    return (
      <div className="pointer-events-none absolute inset-0 z-0 bg-neutral-900" />
    );
  }

  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      <div
        className="absolute inset-0"
        style={{ opacity: aActive ? 1 : 0, transition: fade }}
      >
        <Image
          src={`/gallery/${photos[a].src}`}
          alt=""
          fill
          sizes="(min-width: 768px) 55vw, 100vw"
          className="object-cover"
          preload={a === 0}
        />
      </div>
      {photos.length > 1 && (
        <div
          className="absolute inset-0"
          style={{ opacity: aActive ? 0 : 1, transition: fade }}
        >
          <Image
            src={`/gallery/${photos[b].src}`}
            alt=""
            fill
            sizes="(min-width: 768px) 55vw, 100vw"
            className="object-cover"
          />
        </div>
      )}
      <div
        className="absolute inset-0 bg-black"
        style={{
          opacity: dim ? 0.3 : 0,
          transition: `opacity ${HOVER_MS}ms ease`,
        }}
      />
    </div>
  );
}

type Quadrant = {
  path: string;
  bg: string;
  fg: string;
  title: string;
  body: React.ReactNode;
};

// Rendered HTML is produced by our sanitizing markdown pipeline
// (src/lib/markdown.ts drops raw HTML tokens), so `dangerouslySetInnerHTML`
// here receives only markdown-generated output, never admin-entered HTML.
const QUADRANT_STYLES: { bg: string; fg: string }[] = [
  { bg: "bg-neutral-900", fg: "text-neutral-100" },
  { bg: "bg-neutral-200", fg: "text-neutral-900" },
  { bg: "bg-neutral-700", fg: "text-neutral-100" },
  { bg: "bg-neutral-900", fg: "text-neutral-200" },
];

function buildQuadrants(
  posts: SurfacePost[],
  sections: SurfaceSections,
  expanded: number | null,
): Quadrant[] {
  const q = sections.quadrants;
  const blogSlug = q[3].slug;
  const blogCenter = expanded === 3 ? " is-centered" : "";
  const bodies: React.ReactNode[] = [
    null,
    (
      <div
        className="markdown stable-col px-6 pb-6 text-xl leading-relaxed"
        dangerouslySetInnerHTML={{ __html: sections.whatido }}
      />
    ),
    (
      <div
        className="markdown stable-col px-6 pb-6 text-xl leading-relaxed"
        dangerouslySetInnerHTML={{ __html: sections.whoiam }}
      />
    ),
    posts.length === 0 ? (
      <p className={`stable-col${blogCenter} px-6 pb-6 text-xl text-neutral-400`}>
        No posts yet.
      </p>
    ) : (
      <ul className={`stable-col${blogCenter} space-y-6 px-6 pb-6 text-xl`}>
        {posts.map((p) => (
          <li key={p.slug}>
            <Link
              href={`/${blogSlug}/${p.slug}`}
              className="underline underline-offset-4 hover:text-blue-500"
            >
              {p.title}
            </Link>
            <span className="ml-3 text-sm text-neutral-500">{p.date}</span>
          </li>
        ))}
      </ul>
    ),
  ];
  return q.map((quad, i) => ({
    path: `/${quad.slug}`,
    bg: QUADRANT_STYLES[i].bg,
    fg: QUADRANT_STYLES[i].fg,
    title: quad.title,
    body: bodies[i],
  }));
}

function pathToIndex(
  pathname: string,
  quadrants: SurfaceQuadrant[],
): number | null {
  for (let i = 0; i < quadrants.length; i++) {
    const path = `/${quadrants[i].slug}`;
    if (pathname === path || pathname.startsWith(path + "/")) return i;
  }
  return null;
}

// Post html is pre-sanitized by renderMarkdown() server-side.
function renderPost(post: SurfacePost) {
  return (
    <article className="stable-col is-centered space-y-4 px-6 pb-10 text-xl leading-relaxed">
      <header className="space-y-1">
        <h2 className="text-lg font-medium tracking-tight">{post.title}</h2>
        <p className="text-sm text-neutral-500">{post.date}</p>
      </header>
      <div
        className="markdown"
        dangerouslySetInnerHTML={{ __html: post.html }}
      />
    </article>
  );
}

type Box = { top: string; left: string; width: string; height: string };

function idleBox(row: number, col: number): Box {
  return {
    width: HALF,
    height: HALF,
    left: col === 0 ? "0%" : HALF,
    top: row === 0 ? "0%" : HALF,
  };
}

function hoverBox(
  row: number,
  col: number,
  hRow: number,
  hCol: number,
  bigW: string = BIG,
  bigH: string = BIG,
): Box {
  const smallW = `calc(100% - (${bigW}))`;
  const smallH = `calc(100% - (${bigH}))`;
  return {
    width: col === hCol ? bigW : smallW,
    height: row === hRow ? bigH : smallH,
    left: col === 0 ? "0%" : hCol === 0 ? bigW : smallW,
    top: row === 0 ? "0%" : hRow === 0 ? bigH : smallH,
  };
}

function aspectHoverSize(imgAspect: number, viewportAspect: number): [string, string] {
  const MAX = 65;
  const ratio = imgAspect / viewportAspect;
  const [w, h] = ratio >= 1 ? [MAX, MAX / ratio] : [MAX * ratio, MAX];
  return [`${w}%`, `${h}%`];
}

function expandedBox(row: number, col: number, cR: number, cC: number): Box {
  if (row === cR && col === cC) {
    return { top: "0%", left: "0%", width: "100%", height: "100%" };
  }
  let left: string, width: string;
  if (col === cC) {
    left = "0%"; width = "100%";
  } else if (col > cC) {
    left = "100%"; width = "0%";
  } else {
    left = "0%"; width = "0%";
  }
  let top: string, height: string;
  if (row === cR) {
    top = "0%"; height = "100%";
  } else if (row > cR) {
    top = "100%"; height = "0%";
  } else {
    top = "0%"; height = "0%";
  }
  return { top, left, width, height };
}

const FALLBACK_PHOTO: Photo = { src: "", w: 16, h: 9 };

const TITLE_COLOR_MS = 700;

// Sample the top band of an image and return its luminance (0 dark .. 1 bright).
// Used to pick a contrasting title color per photo.
function sampleBrightness(url: string): Promise<number> {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const sampleH = Math.max(1, Math.round(img.naturalHeight * 0.25));
        const scale = 40 / img.naturalWidth;
        const cw = 40;
        const ch = Math.max(1, Math.round(sampleH * scale));
        const canvas = document.createElement("canvas");
        canvas.width = cw;
        canvas.height = ch;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) return resolve(0.5);
        ctx.drawImage(
          img,
          0, 0, img.naturalWidth, sampleH,
          0, 0, cw, ch,
        );
        const data = ctx.getImageData(0, 0, cw, ch).data;
        let sum = 0;
        let count = 0;
        for (let i = 0; i < data.length; i += 4) {
          sum += 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
          count++;
        }
        resolve(count === 0 ? 0.5 : sum / (count * 255));
      } catch {
        resolve(0.5);
      }
    };
    img.onerror = () => resolve(0.5);
    img.src = url;
  });
}

export default function Surface({
  photos,
  posts,
  sections,
}: {
  photos: Photo[];
  posts: SurfacePost[];
  sections: SurfaceSections;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const expanded = pathToIndex(pathname, sections.quadrants);
  const blogSlug = sections.quadrants[3].slug;
  const [hovered, setHovered] = useState<number | null>(null);
  const [suppressHover, setSuppressHover] = useState(false);
  const prevExpandedRef = useRef<number | null>(expanded);
  const cursorSectionRef = useRef<number | null>(null);
  const [activePhoto, setActivePhoto] = useState<Photo>(
    photos[0] ?? FALLBACK_PHOTO,
  );
  const [viewportAspect, setViewportAspect] = useState(16 / 9);
  const [photoBrightness, setPhotoBrightness] = useState(0.5);
  const brightnessCacheRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    const src = activePhoto?.src;
    if (!src) return;
    const cache = brightnessCacheRef.current;
    const cached = cache.get(src);
    if (cached !== undefined) {
      setPhotoBrightness(cached);
      return;
    }
    let cancelled = false;
    sampleBrightness(`/gallery/${src}`).then((b) => {
      cache.set(src, b);
      if (!cancelled) setPhotoBrightness(b);
    });
    return () => {
      cancelled = true;
    };
  }, [activePhoto?.src]);

  useEffect(() => {
    const update = () => setViewportAspect(window.innerWidth / window.innerHeight);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const quadrants = buildQuadrants(posts, sections, expanded);

  useEffect(() => {
    for (const q of quadrants) router.prefetch(q.path);
    router.prefetch("/");
    for (const p of posts) router.prefetch(`/${blogSlug}/${p.slug}`);
  }, [router, posts, quadrants, blogSlug]);

  useEffect(() => {
    if (expanded !== null) setHovered(null);
  }, [expanded]);

  useEffect(() => {
    const justCollapsed =
      prevExpandedRef.current !== null && expanded === null;
    prevExpandedRef.current = expanded;
    if (!justCollapsed) return;
    setSuppressHover(true);
    const t = setTimeout(() => {
      setSuppressHover(false);
      if (cursorSectionRef.current !== null) {
        setHovered(cursorSectionRef.current);
      }
    }, 600);
    return () => clearTimeout(t);
  }, [expanded]);

  useEffect(() => {
    if (expanded === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") router.push("/");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [expanded, router]);

  if (pathname.startsWith("/ronan")) return null;

  const postSlug = pathname.startsWith(`/${blogSlug}/`)
    ? pathname.slice(blogSlug.length + 2)
    : null;
  const currentPost = postSlug
    ? posts.find((p) => p.slug === postSlug) ?? null
    : null;

  const handleClick = (i: number, e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("a")) return;
    if (i === 0) return;
    if (expanded !== null) {
      router.push("/");
      return;
    }
    router.push(quadrants[i].path);
  };
  const handleEnter = (i: number) => {
    cursorSectionRef.current = i;
    if (expanded !== null) return;
    if (suppressHover) return;
    setHovered(i);
  };
  const handleLeave = (i: number) => {
    if (cursorSectionRef.current === i) cursorSectionRef.current = null;
    if (expanded !== null) return;
    setHovered((h) => (h === i ? null : h));
  };

  const layoutTiming =
    expanded !== null
      ? `${EXPAND_MS}ms cubic-bezier(0, 0, 0.2, 1)`
      : `${HOVER_MS}ms cubic-bezier(0.3, 0, 0.2, 1)`;
  const transition = `top ${layoutTiming}, left ${layoutTiming}, width ${layoutTiming}, height ${layoutTiming}`;

  return (
    <main className="relative flex-1 overflow-hidden">
      {quadrants.map((q, i) => {
        const row = Math.floor(i / 2);
        const col = i % 2;
        const isExpanded = expanded === i;
        const beingPushed = expanded !== null && !isExpanded;

        let box: Box;
        if (expanded !== null) {
          box = expandedBox(row, col, Math.floor(expanded / 2), expanded % 2);
        } else if (hovered !== null) {
          const [bigW, bigH] =
            hovered === 0
              ? aspectHoverSize(activePhoto.w / activePhoto.h, viewportAspect)
              : [BIG, BIG];
          box = hoverBox(row, col, Math.floor(hovered / 2), hovered % 2, bigW, bigH);
        } else {
          box = idleBox(row, col);
        }

        return (
          <section
            key={q.path}
            onMouseEnter={() => handleEnter(i)}
            onMouseLeave={() => handleLeave(i)}
            onClick={(e) => handleClick(i, e)}
            style={{
              ...box,
              zIndex: isExpanded ? 30 : 0,
              transition,
              overflowX: "hidden",
              overflowY: isExpanded ? "auto" : "hidden",
            }}
            className={`${q.bg} ${q.fg} absolute ${i === 0 ? "cursor-default" : "cursor-pointer"}`}
          >
            {i === 0 && (
              <Slideshow
                photos={photos}
                onActivePhotoChange={setActivePhoto}
                dim={hovered !== 0 && expanded !== 0}
              />
            )}
            <h1
              className={`relative z-10 px-6 pt-6 pb-4 text-xl font-medium tracking-tight whitespace-nowrap${
                i === 3 ? ` stable-col${expanded === 3 ? " is-centered" : ""}` : ""
              }`}
              style={
                i === 0
                  ? {
                      color:
                        hovered === 0 && photoBrightness > 0.55
                          ? "#000"
                          : "#fff",
                      transition: `color ${TITLE_COLOR_MS}ms ease-in-out`,
                    }
                  : undefined
              }
            >
              {q.title.split("").map((char, ci) => (
                <span
                  key={ci}
                  className="inline-block"
                  style={{
                    opacity: beingPushed ? 0 : 1,
                    transform: beingPushed ? "translateY(-4px)" : "translateY(0)",
                    transition: `opacity ${TEXT_FADE_MS}ms ease, transform ${TEXT_FADE_MS}ms ease`,
                    transitionDelay: beingPushed ? `${ci * TEXT_CHAR_STEP_MS}ms` : "0ms",
                  }}
                >
                  {char === " " ? " " : char}
                </span>
              ))}
            </h1>
            <div
              className="relative z-10"
              style={{
                opacity: beingPushed ? 0 : 1,
                transform: beingPushed ? "translateY(-8px)" : "translateY(0)",
                transition: `opacity ${TEXT_FADE_MS}ms ease, transform ${TEXT_FADE_MS}ms ease`,
              }}
            >
              {i === 3 && currentPost ? renderPost(currentPost) : q.body}
            </div>
          </section>
        );
      })}
    </main>
  );
}
