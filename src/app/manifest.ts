import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Cravely",
    short_name: "Cravely",
    description:
      "Discover nearby restaurants, dishes, prices and ratings. Build packages and compare prices near you.",
    start_url: "/",
    display: "standalone",
    background_color: "#fcfcfc",
    theme_color: "#ff4757",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
