import { z } from 'zod'
import { router, authedProcedure } from '../trpc/trpc.js'
import { createStackSchema, updateStackSchema } from '@notes/shared'

function mapStack(s: any) {
  return {
    ...s,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
  }
}

export const stacksRouter = router({
  list: authedProcedure.query(async ({ ctx }) => {
    const stacks = await ctx.db.stack.findMany({
      where: { userId: ctx.user.id },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    })
    return stacks.map(mapStack)
  }),

  create: authedProcedure
    .input(createStackSchema)
    .mutation(async ({ ctx, input }) => {
      const last = await ctx.db.stack.findFirst({
        where: { userId: ctx.user.id },
        orderBy: { sortOrder: 'desc' },
        select: { sortOrder: true },
      })
      // Simple sortOrder: timestamp string keeps insertion order
      const sortOrder = last?.sortOrder
        ? String(Date.now())
        : String(Date.now())

      const stack = await ctx.db.stack.create({
        data: { ...input, userId: ctx.user.id, sortOrder },
      })
      return mapStack(stack)
    }),

  update: authedProcedure
    .input(z.object({ id: z.string() }).merge(updateStackSchema))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input
      await ctx.db.stack.findFirstOrThrow({ where: { id, userId: ctx.user.id } })
      const stack = await ctx.db.stack.update({ where: { id }, data })
      return mapStack(stack)
    }),

  delete: authedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.stack.findFirstOrThrow({ where: { id: input.id, userId: ctx.user.id } })
      // Detach notes from this stack before deleting
      await ctx.db.note.updateMany({
        where: { stackId: input.id, userId: ctx.user.id },
        data: { stackId: null },
      })
      await ctx.db.stack.delete({ where: { id: input.id } })
      return { id: input.id }
    }),
})
