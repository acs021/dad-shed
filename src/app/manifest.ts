import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Dad Shed",
    short_name: "Dad Shed",
    description: "Borrow gear from the block.",
    start_url: "/",
    display: "standalone",
    background_color: "#efe6d6",
    theme_color: "#1c3b30",
  };
}
