import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, authedProcedure } from '../trpc/trpc.js'
import { createLabelSchema, updateLabelSchema } from '@notes/shared'

function mapLabel(l: any) {
  return { ...l, createdAt: l.createdAt.toISOString() }
}

export const labelsRouter = router({
  list: authedProcedure.query(async ({ ctx }) => {
    const labels = await ctx.db.label.findMany({
      where: { userId: ctx.user.id },
      orderBy: { name: 'asc' },
    })
    return labels.map(mapLabel)
  }),

  create: authedProcedure
    .input(createLabelSchema)
    .mutation(async ({ ctx, input }) => {
      const label = await ctx.db.label.create({
        data: { ...input, userId: ctx.user.id },
      })
      return mapLabel(label)
    }),

  update: authedProcedure
    .input(z.object({ id: z.string() }).merge(updateLabelSchema))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input
      await ctx.db.label.findFirstOrThrow({ where: { id, userId: ctx.user.id } })
      const label = await ctx.db.label.update({ where: { id }, data })
      return mapLabel(label)
    }),

  delete: authedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.label.findFirstOrThrow({ where: { id: input.id, userId: ctx.user.id } })
      await ctx.db.label.delete({ where: { id: input.id } })
      return { id: input.id }
    }),

  attach: authedProcedure
    .input(z.object({ noteId: z.string(), labelId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.note.findFirstOrThrow({ where: { id: input.noteId, userId: ctx.user.id } })
      await ctx.db.label.findFirstOrThrow({ where: { id: input.labelId, userId: ctx.user.id } })
      await ctx.db.noteLabel.upsert({
        where: { noteId_labelId: input },
        create: input,
        update: {},
      })
      return input
    }),

  detach: authedProcedure
    .input(z.object({ noteId: z.string(), labelId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.note.findFirstOrThrow({ where: { id: input.noteId, userId: ctx.user.id } })
      await ctx.db.noteLabel.delete({
        where: { noteId_labelId: input },
      }).catch(() => null) // Ignore if doesn't exist
      return input
    }),
})
