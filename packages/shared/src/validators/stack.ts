import { z } from 'zod'

export const createStackSchema = z.object({
  name: z.string().min(1).max(60),
  icon: z.string().optional(),
  color: z.string().optional(),
})

export const updateStackSchema = z.object({
  name: z.string().min(1).max(60).optional(),
  icon: z.string().nullable().optional(),
  color: z.string().nullable().optional(),
})

export type CreateStackInput = z.infer<typeof createStackSchema>
export type UpdateStackInput = z.infer<typeof updateStackSchema>
