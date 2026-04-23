import fs from "node:fs/promises";
import path from "node:path";

const DATA_DIR = path.join(process.cwd(), "data");
const PHOTOS_FILE = path.join(DATA_DIR, "photos.json");
const POSTS_FILE = path.join(DATA_DIR, "posts.json");
const SECTIONS_FILE = path.join(DATA_DIR, "sections.json");

export type Photo = { src: string; w: number; h: number };
export type Post = {
  slug: string;
  title: string;
  date: string;
  body: string; // markdown
};
export type Sections = {
  whatido: string; // markdown
  whoiam: string; // markdown
};

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

const DEFAULT_SECTIONS: Sections = { whatido: "", whoiam: "" };
export const getSections = (): Promise<Sections> =>
  readJSON(SECTIONS_FILE, DEFAULT_SECTIONS);
export const saveSections = (sections: Sections) =>
  writeJSON(SECTIONS_FILE, sections);
