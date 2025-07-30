import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const projects = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/data/projects' }),
  schema: z.object({
    name: z.string(),
    year: z.number(),
    month: z.number(),
    location: z.string(),
    type: z.string(),
    type_en: z.string().optional(),
    images: z.array(
      z.object({
        src: z.string(),
        alt: z.string(),
      })
    ),
    body_en: z.string().optional(),
  }),
});

export const collections = { projects };
