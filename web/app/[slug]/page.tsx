import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { pages } from "@/content/pages";
import { StaticPage } from "@/components/shop/static-page";

export function generateStaticParams() {
  return Object.keys(pages).map(slug => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const content = pages[slug];
  return content ? { title: `${content.title} | Everyday`, description: content.subtitle } : {};
}

export default async function StaticContentPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const content = pages[slug];
  if (!content) notFound();
  return <StaticPage content={content} />;
}
