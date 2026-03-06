import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { generateKeyBetween } from 'fractional-indexing/src/index.js'
import { router, authedProcedure } from '../trpc/trpc.js'

export const taskStepsRouter = router({
  create: authedProcedure
    .input(z.object({
      noteId: z.string(),
      title: z.string(),
      description: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.note.findFirstOrThrow({
        where: { id: input.noteId, userId: ctx.user.id },
      })

      const last = await ctx.db.taskStep.findFirst({
        where: { noteId: input.noteId },
        orderBy: { sortOrder: 'desc' },
        select: { sortOrder: true },
      })
      const sortOrder = generateKeyBetween(last?.sortOrder || null, null)

      const step = await ctx.db.taskStep.create({
        data: { ...input, sortOrder },
      })
      return { ...step, createdAt: step.createdAt.toISOString() }
    }),

  update: authedProcedure
    .input(z.object({
      id: z.string(),
      title: z.string().optional(),
      description: z.string().nullable().optional(),
      isComplete: z.boolean().optional(),
      sortOrder: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input
      const step = await ctx.db.taskStep.findFirstOrThrow({
        where: { id },
        include: { note: { select: { userId: true } } },
      })
      if (step.note.userId !== ctx.user.id) throw new TRPCError({ code: 'FORBIDDEN' })
      const updated = await ctx.db.taskStep.update({ where: { id }, data })
      return { ...updated, createdAt: updated.createdAt.toISOString() }
    }),

  delete: authedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const step = await ctx.db.taskStep.findFirstOrThrow({
        where: { id: input.id },
        include: { note: { select: { userId: true } } },
      })
      if (step.note.userId !== ctx.user.id) throw new TRPCError({ code: 'FORBIDDEN' })
      await ctx.db.taskStep.delete({ where: { id: input.id } })
      return { id: input.id }
    }),
})
