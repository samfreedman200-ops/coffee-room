import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/env";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin",
          "/admin/*",
          "/me",
          "/me/*",
          "/dm",
          "/dm/*",
          "/notifications",
          "/signup",
          "/login",
          "/recover",
          "/recover/*",
          "/submissions",
          "/submissions/*",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
