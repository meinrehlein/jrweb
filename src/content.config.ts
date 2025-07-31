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
    orientation: z.enum(['1:1.4', '1.4:1']).default('1:1.4'),
    body_en: z.string().optional(),
  }),
});

export const collections = { projects };
