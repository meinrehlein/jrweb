import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const projects = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/data/projects' }),
  schema: z.object({
    online: z.boolean().default(true),
    title: z.string().optional(),
    images: z
      .array(
        z.object({
          src: z.string(),
          alt: z.string(),
        })
      )
      .optional(),
    video: z.string().optional(),
    startTime: z.number().optional(),
    kind: z.enum(['image', 'text', 'video']).default('image'),
    aspectRatio: z.string().optional(),
    order_about: z.preprocess(
      (v) => (typeof v === "string" ? parseInt(v, 10) : v),
      z.number().int().default(0)
    ),
    order_projects: z.preprocess(
      (v) => (typeof v === "string" ? parseInt(v, 10) : v),
      z.number().int().default(0)
    ),
    order_video: z.preprocess(
      (v) => (typeof v === "string" ? parseInt(v, 10) : v),
      z.number().int().default(0)
    ),
    order_secondary: z.preprocess(
      (v) => (typeof v === "string" ? parseInt(v, 10) : v),
      z.number().int().default(0)
    ),
    category: z.enum(['A', 'B', 'C']).default('B'),
    body_en: z.string().optional(),
    created: z.string().optional(),
    updated: z.string().optional(),
  
  }),
});

export const collections = { projects };