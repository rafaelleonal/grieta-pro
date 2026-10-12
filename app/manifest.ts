import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "GrietaPro — Tu coach de League of Legends",
    short_name: "GrietaPro",
    description:
      "Consejos directos para tu matchup, tus primeros niveles y tu partida de League of Legends.",
    lang: "es-MX",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#161826",
    theme_color: "#161826",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
