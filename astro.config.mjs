import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";

const site = process.env.SITE_URL ?? "https://dbstate.com";

export default defineConfig({
  output: "static",
  ...(site ? { site } : {}),

  vite: {
    plugins: [tailwindcss()],
  },
});
