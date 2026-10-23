import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Hoops League",
    short_name: "Hoops",
    description: "Private fantasy basketball with Lock-In scoring.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#0c8312",
    icons: [
      { src: "/pwa-icon/192", sizes: "192x192", type: "image/png" },
      { src: "/pwa-icon/512", sizes: "512x512", type: "image/png" },
      { src: "/pwa-icon/512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
