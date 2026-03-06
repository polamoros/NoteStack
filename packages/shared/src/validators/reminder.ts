import { z } from 'zod'

export const createReminderSchema = z.object({
  noteId: z.string(),
  scheduledAt: z.string().datetime(),
  rrule: z.string().optional(),
})

export const updateReminderSchema = z.object({
  scheduledAt: z.string().datetime().optional(),
  rrule: z.string().nullable().optional(),
})

export type CreateReminderInput = z.infer<typeof createReminderSchema>
export type UpdateReminderInput = z.infer<typeof updateReminderSchema>
