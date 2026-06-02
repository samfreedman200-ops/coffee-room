import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/env";
import { listPosts, countPublishedPosts } from "@/lib/posts";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const total = countPublishedPosts();
  const pageSize = 200;
  const pages = Math.max(1, Math.ceil(total / pageSize));

  const postEntries: MetadataRoute.Sitemap = [];
  for (let i = 0; i < pages; i++) {
    const posts = listPosts(i, pageSize);
    for (const p of posts) {
      postEntries.push({
        url: `${SITE_URL}/post/${p.id}`,
        lastModified: new Date(p.edited_at ?? p.created_at),
        changeFrequency: "weekly",
        priority: p.via_submission_id ? 0.8 : 0.6,
      });
    }
  }

  return [
    {
      url: `${SITE_URL}/`,
      lastModified: new Date(),
      changeFrequency: "hourly",
      priority: 1,
    },
    {
      url: `${SITE_URL}/search`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.4,
    },
    ...postEntries,
  ];
}
