import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Surface from "./_components/Surface";
import { getPhotos, getPosts, getSections } from "@/lib/data";
import { renderMarkdown } from "@/lib/markdown";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Ronan Hevenor",
};

export const dynamic = "force-dynamic";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [photos, posts, sections] = await Promise.all([
    getPhotos(),
    getPosts(),
    getSections(),
  ]);
  const renderedPosts = posts.map((p) => ({
    slug: p.slug,
    title: p.title,
    date: p.date,
    html: renderMarkdown(p.body),
  }));
  const renderedSections = {
    whatido: renderMarkdown(sections.whatido),
    whoiam: renderMarkdown(sections.whoiam),
  };
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Surface
          photos={photos}
          posts={renderedPosts}
          sections={renderedSections}
        />
        {children}
      </body>
    </html>
  );
}
