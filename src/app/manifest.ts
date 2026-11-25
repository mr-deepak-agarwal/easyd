import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Easy D",
    short_name: "Easy D",
    description: "Projects, tasks, time, HR and invoicing for your team",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    background_color: "#f0f4f1",
    theme_color: "#00510f",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "New task", url: "/tasks?new=1" },
      { name: "Log time", url: "/time-tracker" },
    ],
  };
}
