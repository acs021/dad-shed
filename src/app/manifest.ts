import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Dad Shed",
    short_name: "Dad Shed",
    description: "Borrow gear from the block.",
    start_url: "/",
    display: "standalone",
    background_color: "#0b1016",
    theme_color: "#0b1016",
  };
}
