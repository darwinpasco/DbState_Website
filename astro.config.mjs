import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";

import cloudflare from "@astrojs/cloudflare";

const site = process.env.SITE_URL;

export default defineConfig({
  output: "static",
  ...(site ? { site } : {}),

  vite: {
    plugins: [tailwindcss()],
  },

  adapter: cloudflare(),
});