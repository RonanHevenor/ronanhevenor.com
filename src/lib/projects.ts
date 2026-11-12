// Projects shown in "What I do": thumbnails on the main site (ProjectScatter), a page each at
// /<what-i-do>/<slug>, and plain versions under /html. Edited in the admin (projects tab) and
// stored in data/projects.json; until that file exists, DEFAULT_PROJECTS is used.
//
// Shared by server and client code, so nothing here touches the filesystem.

export type ImageRef = { src: string; w: number; h: number };

export type Project = {
  slug: string;
  title: string;
  logo: ImageRef; // the thumbnail; transparent margins trimmed on upload, corners rounded in CSS
  logoAlt: string; // what the logo shows, for screen readers and the plain version
  titleImage: ImageRef; // the project's name in its own type: under the thumbnail, top of its page
  size: number; // how big the thumbnail is relative to the others (its preferred width, in vw)
  titleSize: number; // how big the title image is relative to the others' (1 = the base label size)
  repo?: string; // GitHub "owner/name"
  href?: string; // live site
  body: string; // markdown: the project's page
};

// The thumbnail's corner radius, as a fraction of its width.
export const CORNER_RADIUS = 0.055;
// A thumbnail's height cap, in vh, is its size times this (keeps big screens in proportion).
export const SIZE_TO_VH_CAP = 1.63;

export const DEFAULT_PROJECTS: Project[] = [
  {
    slug: "typeset",
    title: "Typeset",
    logo: { src: "/projects/typeset-tile.png", w: 413, h: 413 },
    logoAlt: "The Typeset app icon: a Roman numeral II in rainbow colours on a black tile",
    titleImage: { src: "/projects/typeset-wordmark.png", w: 1548, h: 360 },
    size: 5.6,
    titleSize: 1.6,
    repo: "RonanHevenor/typeset",
    body: "",
  },
  {
    slug: "poly-rpi-edu",
    title: "poly.rpi.edu",
    logo: { src: "/projects/poly-site.png", w: 2880, h: 1920 },
    logoAlt: "The front page of poly.rpi.edu, The Polytechnic's website, in dark mode",
    titleImage: { src: "/projects/poly-rpi-edu.svg", w: 1121, h: 200 },
    size: 13.5,
    titleSize: 2,
    repo: "thepoly/polymer",
    href: "https://poly.rpi.edu",
    body: "",
  },
  {
    slug: "sentinel",
    title: "Sentinel",
    logo: { src: "/projects/sentinel-leds.jpg", w: 640, h: 480 },
    logoAlt:
      "Sentinel's camera view of a heating controller's indicator lights, with green and red detection boxes",
    titleImage: { src: "/projects/sentinel-title.png", w: 1030, h: 154 },
    size: 9.5,
    titleSize: 1.9,
    repo: "RonanHevenor/sentinel",
    body: "",
  },
];
