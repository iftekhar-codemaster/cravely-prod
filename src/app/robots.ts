import type { MetadataRoute } from "next";
import { APP_URL } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/console/",
          "/profile",
          "/login",
          "/verify-email",
          "/liked",
        ],
      },
    ],
    sitemap: `${APP_URL}/sitemap.xml`,
  };
}
