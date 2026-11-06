import { z } from 'zod';

const tag = z.string().trim().min(1).max(40);

export const createNoteAction = z.object({
  type: z.literal('create'),
  folderPath: z.string().trim().min(1),
  title: z.string().trim().min(1).max(200),
  content: z.string().min(1),
  summary: z.string().trim().min(1).max(500),
  tags: z.array(tag).max(10),
});

export const appendToNoteAction = z.object({
  type: z.literal('append'),
  noteId: z.uuid(),
  sectionTitle: z.string().trim().min(1).max(200),
  content: z.string().min(1),
  summary: z.string().trim().min(1).max(500),
  tags: z.array(tag).max(10),
});

export const sortAction = z.discriminatedUnion('type', [createNoteAction, appendToNoteAction]);

export const sortPlan = z.object({
  actions: z.array(sortAction).min(1).max(20),
  explanation: z.string().trim().max(1000),
});

export type CreateNoteAction = z.infer<typeof createNoteAction>;
export type AppendToNoteAction = z.infer<typeof appendToNoteAction>;
export type SortAction = z.infer<typeof sortAction>;
export type SortPlan = z.infer<typeof sortPlan>;

export function parseSortPlan(input: unknown): SortPlan {
  return sortPlan.parse(input);
}
