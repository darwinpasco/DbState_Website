import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const docs = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/docs" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    section: z.string(),
    order: z.number(),
    draft: z.boolean().default(false),
    updated: z.coerce.date().optional(),
    keywords: z.array(z.string()).optional(),
  }),
});

export const collections = { docs };
