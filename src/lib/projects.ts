// The projects shown in "What I do": thumbnails on the main site (ProjectScatter) and a plain
// list on /html. One list so the two never disagree.

import type { CSSProperties } from "react";

// Each label is set in the project's own type: an image of its wordmark, or text styled like it.
export type Label =
  | { kind: "image"; src: string; w: number; h: number }
  | { kind: "text"; text: string; style: CSSProperties };

export type Project = {
  title: string;
  alt: string; // what the thumbnail shows, for screen readers and the plain page
  href?: string; // where the project lives, if it's public
  repo: string; // its GitHub repository, "owner/name"; the thumbnail links there
  src: string;
  w: number; // intrinsic size, for the aspect ratio
  h: number;
  base: number; // preferred width, in vw (capped by `cap` vh); shrunk further if it doesn't fit
  cap: number;
  radius?: number; // corner radius as a fraction of the width, so it scales with the thumbnail
  labelScale?: number; // label size relative to the others
  inset?: number; // transparent margin below the visible image, as a fraction of its width
  label: Label;
};

export const PROJECTS: Project[] = [
  {
    title: "Typeset",
    repo: "RonanHevenor/typeset",
    alt: "The Typeset app icon: a Roman numeral II in rainbow colours on a black tile",
    src: "/projects/typeset.png", w: 512, h: 512, base: 7, cap: 11.5,
    // "Typeset" in SF Pro Black filled with the app icon's rainbow
    labelScale: 1.6,
    inset: 49 / 512, // the icon's tile stops short of the image's edges (standard macOS icon padding)
    label: { kind: "image", src: "/projects/typeset-wordmark.png", w: 1548, h: 360 },
  },
  {
    title: "poly.rpi.edu",
    repo: "thepoly/polymer",
    alt: "The front page of poly.rpi.edu, The Polytechnic's website, in dark mode",
    href: "https://poly.rpi.edu",
    src: "/projects/poly-site.png", w: 2880, h: 1920, base: 13.5, cap: 22, radius: 0.055,
    // the site's wordmark in the paper's red, #D6001C; a long, light wordmark, so set larger
    labelScale: 2,
    label: { kind: "image", src: "/projects/poly-rpi-edu.svg", w: 1121, h: 200 },
  },
  {
    title: "Sentinel",
    repo: "RonanHevenor/sentinel",
    alt: "Sentinel's camera view of a heating controller's indicator lights, with green and red detection boxes",
    src: "/projects/sentinel-leds.jpg", w: 640, h: 480, base: 9.5, cap: 15.5, radius: 0.055,
    // the Sentinel dashboard's header: light weight, capitals, letter-spacing 4px at 32px
    labelScale: 1.9,
    label: {
      kind: "text",
      text: "SENTINEL",
      style: {
        fontFamily: "'Segoe UI', system-ui, sans-serif",
        fontWeight: 300,
        letterSpacing: "0.125em",
        marginRight: "-0.125em", // the spacing after the last letter shouldn't push it off centre
      },
    },
  },
];
