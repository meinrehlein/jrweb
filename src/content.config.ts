import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const projects = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/data/projects' }),
  schema: z.object({
    name: z.string().optional(),
    title: z.string().optional(),
    year: z.number().optional(),
    month: z.number().optional(),
    location: z.string().optional(),
    type: z.string().optional(),
    type_en: z.string().optional(),
    images: z
      .array(
        z.object({
          src: z.string(),
          alt: z.string(),
        })
      )
      .optional(),
    video: z.string().optional(),
    kind: z.enum(['image', 'text', 'video']).default('image'),
    order_about: z.number().optional(),
    order_projects: z.number().optional(),
    order_video: z.number().optional(),
    category: z.enum(['A', 'B', 'C']).default('B'),
    body_en: z.string().optional(),
  }),
});

export const collections = { projects };
