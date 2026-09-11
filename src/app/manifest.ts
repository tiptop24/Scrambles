import type { MetadataRoute } from "next";

// Lets players add Scrambles to their home screen — a season runs 38 weeks,
// so a one-tap icon on the home screen beats hunting for the link in a
// group chat every gameweek.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Scrambles — Premier League Pick 'Em",
    short_name: "Scrambles",
    description:
      "Pick one Premier League team a week. Win and survive, lose and you're out. Last one standing wins.",
    start_url: "/",
    display: "standalone",
    background_color: "#37003c",
    theme_color: "#37003c",
    icons: [
      { src: "/icon-192", sizes: "192x192", type: "image/png" },
      { src: "/icon-512", sizes: "512x512", type: "image/png" },
    ],
  };
}
