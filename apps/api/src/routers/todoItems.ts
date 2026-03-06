import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { generateKeyBetween } from 'fractional-indexing/src/index.js'
import { router, authedProcedure } from '../trpc/trpc.js'

export const todoItemsRouter = router({
  create: authedProcedure
    .input(z.object({ noteId: z.string(), text: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Verify note ownership
      await ctx.db.note.findFirstOrThrow({
        where: { id: input.noteId, userId: ctx.user.id },
      })

      const last = await ctx.db.todoItem.findFirst({
        where: { noteId: input.noteId },
        orderBy: { sortOrder: 'desc' },
        select: { sortOrder: true },
      })
      const sortOrder = generateKeyBetween(last?.sortOrder || null, null)

      const item = await ctx.db.todoItem.create({
        data: { noteId: input.noteId, text: input.text, sortOrder },
      })
      return { ...item, createdAt: item.createdAt.toISOString() }
    }),

  update: authedProcedure
    .input(z.object({
      id: z.string(),
      text: z.string().optional(),
      isChecked: z.boolean().optional(),
      sortOrder: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input
      const item = await ctx.db.todoItem.findFirstOrThrow({
        where: { id },
        include: { note: { select: { userId: true } } },
      })
      if (item.note.userId !== ctx.user.id) throw new TRPCError({ code: 'FORBIDDEN' })
      const updated = await ctx.db.todoItem.update({ where: { id }, data })
      return { ...updated, createdAt: updated.createdAt.toISOString() }
    }),

  delete: authedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const item = await ctx.db.todoItem.findFirstOrThrow({
        where: { id: input.id },
        include: { note: { select: { userId: true } } },
      })
      if (item.note.userId !== ctx.user.id) throw new TRPCError({ code: 'FORBIDDEN' })
      await ctx.db.todoItem.delete({ where: { id: input.id } })
      return { id: input.id }
    }),
})
