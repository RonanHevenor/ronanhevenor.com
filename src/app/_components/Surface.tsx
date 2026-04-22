"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const photos = [
  "RonanHevenor-01.jpg",
  "RonanHevenor-04.jpg",
  "RonanHevenor-05.jpg",
  "RonanHevenor-06.jpg",
  "RonanHevenor-07.jpg",
  "RonanHevenor-08.jpg",
  "RonanHevenor-09.jpg",
  "RonanHevenor-10.jpg",
  "RonanHevenor-11.jpg",
  "RonanHevenor-12.jpg",
  "RonanHevenor-13.jpg",
  "RonanHevenor-14.jpg",
  "RonanHevenor-15.jpg",
  "RonanHevenor-16.jpg",
  "2002-kingston-droneshot-17.jpg",
  "2002-kingston-droneshot-18.jpg",
  "2002-kingston-droneshot-19.jpg",
  "2002-kingston-droneshot-20.jpg",
  "2002-kingston-droneshot-21.jpg",
  "2002-kingston-droneshot-22.jpg",
  "2002-kingston-droneshot-23.jpg",
  "2002-kingston-droneshot-24.jpg",
  "2002-kingston-droneshot-25.jpg",
  "2002-kingston-droneshot-26.jpg",
  "2002-kingston-droneshot-27.jpg",
];

type Quadrant = {
  path: string;
  bg: string;
  fg: string;
  title: string;
  body: React.ReactNode;
};

const quadrants: Quadrant[] = [
  {
    path: "/whatisee",
    bg: "bg-white",
    fg: "text-neutral-900",
    title: "What I see",
    body: (
      <>
        <p className="max-w-2xl px-6 pb-6 text-lg leading-relaxed">
          These are some of my favorite pictures I&apos;ve taken with my DJI Mini 4 Pro.
        </p>
        <div className="columns-1 gap-3 px-3 pb-6 md:columns-2 lg:columns-3">
          {photos.map((file, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={file}
              src={`/gallery/${file}`}
              alt=""
              loading={i < 6 ? "eager" : "lazy"}
              className="mb-3 block w-full break-inside-avoid"
            />
          ))}
        </div>
      </>
    ),
  },
  {
    path: "/whatido",
    bg: "bg-neutral-200",
    fg: "text-neutral-900",
    title: "What I do",
    body: (
      <p className="max-w-2xl px-6 pb-6 text-lg leading-relaxed">
        I designed and built this website, as well as a few others for the clubs I love.
        <br />
        <a
          href="https://poly.rpi.edu/"
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-4 hover:text-blue-500"
        >
          poly.rpi.edu
        </a>
        {" · "}
        <a
          href="https://rpai.club/"
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-4 hover:text-blue-500"
        >
          rpai.club
        </a>
        <br />
        You can see more things I&apos;ve done on my Github and on my Linkedin.
        <br />
        <a
          href="https://github.com/RonanHevenor"
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-4 hover:text-blue-500"
        >
          github.com/RonanHevenor
        </a>
        {" · "}
        <a
          href="https://www.linkedin.com/in/hevenor/"
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-4 hover:text-blue-500"
        >
          linkedin.com/in/hevenor
        </a>
      </p>
    ),
  },
  {
    path: "/whoiam",
    bg: "bg-neutral-700",
    fg: "text-neutral-100",
    title: "Who I am",
    body: (
      <div className="max-w-2xl space-y-4 px-6 pb-6 text-lg leading-relaxed">
        <p>
          Hi, I&apos;m Ronan! I&apos;m a computer scientist and leader seeking to gain extensive
          experience in STEM-related leadership roles to advance my understanding of technology and
          its application in solving global challenges. Leveraging my love for learning and
          innovation, I aim to use my skills in mathematics, science, and collaborative
          problem-solving to make a meaningful impact on the world.
        </p>
        <p>
          I have extensive experience competing in the FIRST Tech Challenge (Team 701 The GONK
          Squad) and the FIRST Robotics Competition (Team 78 Air Strike), as well as multiple events
          with North Kingstown&apos;s Chapters of DECA and the Technology Student Association.
        </p>
      </div>
    ),
  },
  {
    path: "/mythoughts",
    bg: "bg-black",
    fg: "text-neutral-100",
    title: "My thoughts",
    body: (
      <ul className="space-y-6 px-6 pb-6 text-lg">
        <li>
          <Link
            href="/mythoughts/lorem-ipsum"
            className="underline underline-offset-4 hover:text-blue-500"
          >
            Lorem ipsum
          </Link>
          <span className="ml-3 text-sm text-neutral-500">2026-04-21</span>
        </li>
      </ul>
    ),
  },
];

const PATH_TO_INDEX: Record<string, number> = {
  "/whatisee": 0,
  "/whatido": 1,
  "/whoiam": 2,
  "/mythoughts": 3,
};

function pathToIndex(pathname: string): number | null {
  for (const [path, idx] of Object.entries(PATH_TO_INDEX)) {
    if (pathname === path || pathname.startsWith(path + "/")) return idx;
  }
  return null;
}

const loremPost = (
  <article className="max-w-2xl space-y-4 px-6 pb-10 text-base leading-relaxed">
    <header className="space-y-1">
      <h2 className="text-lg font-medium tracking-tight">Lorem ipsum</h2>
      <p className="text-sm text-neutral-500">2026-04-21</p>
    </header>
    <p>
      Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod
      tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim
      veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea
      commodo consequat.
    </p>
    <p>
      Duis aute irure dolor in reprehenderit in voluptate velit esse cillum
      dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non
      proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
    </p>
    <p>
      Sed ut perspiciatis unde omnis iste natus error sit voluptatem
      accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab
      illo inventore veritatis et quasi architecto beatae vitae dicta sunt
      explicabo.
    </p>
  </article>
);

const BIG = "55%";
const SMALL = "45%";
const HALF = "50%";

const HOVER_MS = 380;
const EXPAND_MS = 750;
const TEXT_FADE_MS = 180;
const TEXT_CHAR_STEP_MS = 25;

type Box = { top: string; left: string; width: string; height: string };

function idleBox(row: number, col: number): Box {
  return {
    width: HALF,
    height: HALF,
    left: col === 0 ? "0%" : HALF,
    top: row === 0 ? "0%" : HALF,
  };
}

function hoverBox(row: number, col: number, hRow: number, hCol: number): Box {
  return {
    width: col === hCol ? BIG : SMALL,
    height: row === hRow ? BIG : SMALL,
    left: col === 0 ? "0%" : hCol === 0 ? BIG : SMALL,
    top: row === 0 ? "0%" : hRow === 0 ? BIG : SMALL,
  };
}

// Each non-clicked tile collapses into the edge nearest the clicked one.
// Perpendicular dimension matches the clicked tile so adjacent edges stay
// touching the entire transition — no gap, no whitespace, ever.
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

export default function Surface() {
  const router = useRouter();
  const pathname = usePathname();
  const expanded = pathToIndex(pathname);
  const [hovered, setHovered] = useState<number | null>(null);

  useEffect(() => {
    for (const q of quadrants) router.prefetch(q.path);
    router.prefetch("/");
    router.prefetch("/mythoughts/lorem-ipsum");
  }, [router]);

  useEffect(() => {
    if (expanded !== null) setHovered(null);
  }, [expanded]);

  useEffect(() => {
    if (expanded === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") router.push("/");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [expanded, router]);

  const handleClick = (i: number, e: React.MouseEvent) => {
    // Let real interactive elements (links) keep their default behaviour.
    if ((e.target as HTMLElement).closest("a")) return;
    if (expanded !== null) {
      router.push("/");
      return;
    }
    router.push(quadrants[i].path);
  };
  const handleEnter = (i: number) => {
    if (expanded !== null) return;
    setHovered(i);
  };
  const handleLeave = (i: number) => {
    if (expanded !== null) return;
    setHovered((h) => (h === i ? null : h));
  };

  const layoutTiming =
    expanded !== null
      ? `${EXPAND_MS}ms cubic-bezier(0.7, 0, 0.2, 1)`
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
          box = hoverBox(row, col, Math.floor(hovered / 2), hovered % 2);
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
            className={`${q.bg} ${q.fg} absolute cursor-pointer`}
          >
            <h1 className="px-6 pt-6 pb-4 text-xl font-medium tracking-tight whitespace-nowrap">
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
              style={{
                opacity: beingPushed ? 0 : 1,
                transform: beingPushed ? "translateY(-8px)" : "translateY(0)",
                transition: `opacity ${TEXT_FADE_MS}ms ease, transform ${TEXT_FADE_MS}ms ease`,
              }}
            >
              {i === 3 && pathname === "/mythoughts/lorem-ipsum" ? loremPost : q.body}
            </div>
          </section>
        );
      })}
    </main>
  );
}
