import type { Metadata } from "next";
import { Geist, Geist_Mono, Newsreader } from "next/font/google";
import "./globals.css";
import Intro, { INTRO_GATE } from "./_components/Intro";
import PlainLink from "./_components/PlainLink";
import Surface from "./_components/Surface";
import Tracker from "./_components/Tracker";
import { cookies } from "next/headers";
import { getPhotos, getPosts, getProjects, getSections } from "@/lib/data";
import { INTRO_SEEN_COOKIE } from "@/lib/intro";
import { renderMarkdown } from "@/lib/markdown";
import { SITE } from "@/lib/seo";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["opsz"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: SITE.title,
    template: `%s — ${SITE.title}`,
  },
  applicationName: SITE.title,
  authors: [{ name: SITE.author, url: SITE.url }],
  creator: SITE.author,
  publisher: SITE.author,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: SITE.locale,
    url: SITE.url,
    siteName: SITE.title,
    title: SITE.title,
  },
  twitter: {
    card: "summary_large_image",
    title: SITE.title,
    creator: SITE.author,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  // No favicon on purpose. An empty data URL stops browsers from also
  // requesting /favicon.ico (which would 404).
  icons: {
    icon: "data:,",
  },
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
};

export const dynamic = "force-dynamic";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // The intro only plays on a first visit ever; after that, leave it out entirely.
  const introSeen = (await cookies()).has(INTRO_SEEN_COOKIE);
  const [photos, posts, sections, projects] = await Promise.all([
    getPhotos(),
    getPosts(),
    getSections(),
    getProjects(),
  ]);
  const renderedProjects = projects.map(({ body, ...p }) => ({
    ...p,
    html: renderMarkdown(body),
  }));
  const renderedPosts = posts.map((p) => ({
    slug: p.slug,
    title: p.title,
    date: p.date,
    html: renderMarkdown(p.body),
  }));
  const renderedSections = {
    whatido: renderMarkdown(sections.whatido),
    whoiam: renderMarkdown(sections.whoiam),
    quadrants: sections.quadrants,
  };

  const personLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: SITE.author,
    url: SITE.url,
  };
  const websiteLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE.title,
    url: SITE.url,
    author: { "@type": "Person", name: SITE.author },
  };

  return (
    <html
      lang="en"
      // the intro's gate script (below) may add "no-intro" before React hydrates
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${newsreader.variable} h-full antialiased${introSeen ? " no-intro" : ""}`}
    >
      <head>
        {/* before first paint: skip the intro on a repeat visit or with reduced motion */}
        <script dangerouslySetInnerHTML={{ __html: INTRO_GATE }} />
      </head>
      <body className="min-h-full flex flex-col">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(personLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteLd) }}
        />
        <Tracker />
        <PlainLink />
        {!introSeen && <Intro />}
        <Surface
          photos={photos}
          posts={renderedPosts}
          sections={renderedSections}
          projects={renderedProjects}
        />
        {children}
      </body>
    </html>
  );
}
