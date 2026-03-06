import { z } from 'zod'

export const createLabelSchema = z.object({
  name: z.string().min(1).max(50),
  color: z.string().optional(),
})

export const updateLabelSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  color: z.string().nullable().optional(),
})

export type CreateLabelInput = z.infer<typeof createLabelSchema>
export type UpdateLabelInput = z.infer<typeof updateLabelSchema>
