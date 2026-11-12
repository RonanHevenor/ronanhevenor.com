import fs from "node:fs/promises";
import path from "node:path";

import { DEFAULT_PROJECTS, type Project } from "./projects";

const DATA_DIR = path.join(process.cwd(), "data");
const PHOTOS_FILE = path.join(DATA_DIR, "photos.json");
const POSTS_FILE = path.join(DATA_DIR, "posts.json");
const SECTIONS_FILE = path.join(DATA_DIR, "sections.json");
const PROJECTS_FILE = path.join(DATA_DIR, "projects.json");
// Project images uploaded in the admin; served by /u/<file>. Like data/, not in git.
export const UPLOADS_DIR = path.join(process.cwd(), "public", "uploads");

export type Photo = { src: string; w: number; h: number };
export type Post = {
  slug: string;
  title: string;
  date: string;
  body: string; // markdown
  pastSlugs?: string[];
};
export type Quadrant = {
  title: string;
  slug: string;
  pastSlugs?: string[];
};
export type Sections = {
  whatido: string; // markdown
  whoiam: string; // markdown
  quadrants: Quadrant[]; // length 4
};

export const DEFAULT_QUADRANTS: Quadrant[] = [
  { title: "What I see", slug: "whatisee" },
  { title: "What I do", slug: "whatido" },
  { title: "Who I am", slug: "whoiam" },
  { title: "My thoughts", slug: "mythoughts" },
];

async function readJSON<T>(file: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await fs.readFile(file, "utf-8"));
  } catch {
    return fallback;
  }
}

async function writeJSON<T>(file: string, data: T): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(file, JSON.stringify(data, null, 2) + "\n");
}

export const getPhotos = (): Promise<Photo[]> => readJSON(PHOTOS_FILE, []);
export const savePhotos = (photos: Photo[]) => writeJSON(PHOTOS_FILE, photos);
export const getPosts = (): Promise<Post[]> => readJSON(POSTS_FILE, []);
export const savePosts = (posts: Post[]) => writeJSON(POSTS_FILE, posts);

export const getSections = async (): Promise<Sections> => {
  const raw = await readJSON<Partial<Sections>>(SECTIONS_FILE, {});
  const rawQuadrants = Array.isArray(raw.quadrants) ? raw.quadrants : [];
  const quadrants: Quadrant[] = DEFAULT_QUADRANTS.map((d, i) => {
    const r = rawQuadrants[i];
    const slug =
      typeof r?.slug === "string" && r.slug.trim() ? r.slug : d.slug;
    const past = Array.isArray(r?.pastSlugs)
      ? r.pastSlugs.filter(
          (s): s is string => typeof s === "string" && !!s && s !== slug,
        )
      : [];
    return {
      title:
        typeof r?.title === "string" && r.title.trim() ? r.title : d.title,
      slug,
      pastSlugs: past,
    };
  });
  return {
    whatido: typeof raw.whatido === "string" ? raw.whatido : "",
    whoiam: typeof raw.whoiam === "string" ? raw.whoiam : "",
    quadrants,
  };
};
export const saveSections = (sections: Sections) =>
  writeJSON(SECTIONS_FILE, sections);

// Projects ("What I do"). Until the admin first saves them, the built-in defaults are used.
export const getProjects = async (): Promise<Project[]> => {
  const raw = await readJSON<Project[] | null>(PROJECTS_FILE, null);
  return Array.isArray(raw) ? raw : DEFAULT_PROJECTS;
};
export const saveProjects = (projects: Project[]) => writeJSON(PROJECTS_FILE, projects);
