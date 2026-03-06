import { z } from 'zod'

export const NOTE_TYPES = ['RICH', 'TODO', 'TASK'] as const
export const NOTE_SIZES = ['SMALL', 'MEDIUM', 'LARGE', 'AUTO'] as const
export const NOTE_COLORS = [
  'DEFAULT', 'RED', 'ORANGE', 'YELLOW', 'GREEN',
  'TEAL', 'BLUE', 'PURPLE', 'PINK', 'BROWN', 'GRAY',
] as const
export const NOTE_STATUSES = ['ACTIVE', 'ARCHIVED', 'TRASHED'] as const

export const createNoteSchema = z.object({
  title: z.string().default(''),
  type: z.enum(NOTE_TYPES).default('RICH'),
  color: z.string().default('DEFAULT'),
  size: z.string().default('AUTO'),   // named (SMALL/MEDIUM/LARGE/AUTO) or numeric px string
  content: z.string().optional(),
  stackId: z.string().nullable().optional(),
})

export const updateNoteSchema = z.object({
  title: z.string().optional(),
  color: z.string().optional(),
  size: z.string().optional(),   // named (SMALL/MEDIUM/LARGE/AUTO) or numeric px string
  content: z.string().optional(),
  isPinned: z.boolean().optional(),
  stackId: z.string().nullable().optional(),
})

export type CreateNoteInput = z.infer<typeof createNoteSchema>
export type UpdateNoteInput = z.infer<typeof updateNoteSchema>
