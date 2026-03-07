import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { generateKeyBetween } from 'fractional-indexing/src/index.js'
import { router, authedProcedure } from '../trpc/trpc.js'
import { createNoteSchema, updateNoteSchema, NOTE_STATUSES } from '@notes/shared'

function noteSelect(userId: string) {
  return {
    where: { userId },
    include: {
      todoItems: { orderBy: { sortOrder: 'asc' as const } },
      taskSteps: { orderBy: { sortOrder: 'asc' as const } },
      labels: { include: { label: true } },
      reminders: true,
    },
  }
}

function mapNote(note: any) {
  return {
    ...note,
    labels: note.labels.map((nl: any) => nl.label),
    createdAt: note.createdAt.toISOString(),
    updatedAt: note.updatedAt.toISOString(),
    trashedAt: note.trashedAt?.toISOString() ?? null,
    todoItems: note.todoItems.map((i: any) => ({
      ...i,
      createdAt: i.createdAt.toISOString(),
    })),
    taskSteps: note.taskSteps.map((s: any) => ({
      ...s,
      createdAt: s.createdAt.toISOString(),
    })),
    reminders: note.reminders.map((r: any) => ({
      ...r,
      scheduledAt: r.scheduledAt.toISOString(),
      nextOccurrence: r.nextOccurrence?.toISOString() ?? null,
      firedAt: r.firedAt?.toISOString() ?? null,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    })),
    // Shared-with users (for avatar display on cards)
    sharedWith: (note.shares ?? []).map((s: any) => ({
      userId: s.sharedWithUser.id,
      name: s.sharedWithUser.name,
      image: s.sharedWithUser.image,
      permission: s.permission,
    })),
  }
}

export const notesRouter = router({
  list: authedProcedure
    .input(z.object({
      status: z.enum(NOTE_STATUSES).default('ACTIVE'),
      labelId: z.string().optional(),
      // stackId filtering: undefined = all notes, null = inbox (no stack), string = specific stack
      stackId: z.string().nullable().optional(),
      cursor: z.string().optional(),
      limit: z.number().min(1).max(100).default(50),
    }))
    .query(async ({ ctx, input }) => {
      const notes = await ctx.db.note.findMany({
        where: {
          userId: ctx.user.id,
          status: input.status,
          ...(input.labelId ? { labels: { some: { labelId: input.labelId } } } : {}),
          // stackId: undefined → no filter; null → stackId IS NULL; string → match
          ...(input.stackId !== undefined ? { stackId: input.stackId } : {}),
          ...(input.cursor ? { sortOrder: { gt: input.cursor } } : {}),
        },
        orderBy: [{ isPinned: 'desc' }, { sortOrder: 'asc' }, { updatedAt: 'desc' }],
        take: input.limit + 1,
        include: {
          todoItems: { orderBy: { sortOrder: 'asc' } },
          taskSteps: { orderBy: { sortOrder: 'asc' } },
          labels: { include: { label: true } },
          reminders: true,
          shares: { include: { sharedWithUser: { select: { id: true, name: true, image: true } } } },
        },
      })

      let nextCursor: string | undefined
      if (notes.length > input.limit) {
        const next = notes.pop()
        nextCursor = next?.sortOrder
      }

      return { notes: notes.map(mapNote), nextCursor }
    }),

  get: authedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const note = await ctx.db.note.findFirst({
        where: { id: input.id, userId: ctx.user.id },
        include: {
          todoItems: { orderBy: { sortOrder: 'asc' } },
          taskSteps: { orderBy: { sortOrder: 'asc' } },
          labels: { include: { label: true } },
          reminders: true,
          shares: { include: { sharedWithUser: { select: { id: true, name: true, image: true } } } },
        },
      })
      if (!note) throw new TRPCError({ code: 'NOT_FOUND' })
      return mapNote(note)
    }),

  create: authedProcedure
    .input(createNoteSchema)
    .mutation(async ({ ctx, input }) => {
      // Get last sort order for this user's active notes
      const last = await ctx.db.note.findFirst({
        where: { userId: ctx.user.id, status: 'ACTIVE' },
        orderBy: { sortOrder: 'desc' },
        select: { sortOrder: true },
      })
      const sortOrder = generateKeyBetween(last?.sortOrder || null, null)

      const note = await ctx.db.note.create({
        data: {
          userId: ctx.user.id,
          sortOrder,
          ...input,
        },
        include: {
          todoItems: true,
          taskSteps: true,
          labels: { include: { label: true } },
          reminders: true,
        },
      })
      return mapNote(note)
    }),

  update: authedProcedure
    .input(z.object({ id: z.string() }).merge(updateNoteSchema))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input
      await ctx.db.note.findFirstOrThrow({ where: { id, userId: ctx.user.id } })
      const note = await ctx.db.note.update({
        where: { id },
        data,
        include: {
          todoItems: { orderBy: { sortOrder: 'asc' } },
          taskSteps: { orderBy: { sortOrder: 'asc' } },
          labels: { include: { label: true } },
          reminders: true,
        },
      })
      return mapNote(note)
    }),

  trash: authedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.note.findFirstOrThrow({ where: { id: input.id, userId: ctx.user.id } })
      const note = await ctx.db.note.update({
        where: { id: input.id },
        data: { status: 'TRASHED', trashedAt: new Date(), isPinned: false },
        include: {
          todoItems: { orderBy: { sortOrder: 'asc' } },
          taskSteps: { orderBy: { sortOrder: 'asc' } },
          labels: { include: { label: true } },
          reminders: true,
        },
      })
      return mapNote(note)
    }),

  restore: authedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.note.findFirstOrThrow({ where: { id: input.id, userId: ctx.user.id } })
      const note = await ctx.db.note.update({
        where: { id: input.id },
        data: { status: 'ACTIVE', trashedAt: null },
        include: {
          todoItems: { orderBy: { sortOrder: 'asc' } },
          taskSteps: { orderBy: { sortOrder: 'asc' } },
          labels: { include: { label: true } },
          reminders: true,
        },
      })
      return mapNote(note)
    }),

  archive: authedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.note.findFirstOrThrow({ where: { id: input.id, userId: ctx.user.id } })
      const note = await ctx.db.note.update({
        where: { id: input.id },
        data: { status: 'ARCHIVED', isPinned: false },
        include: {
          todoItems: { orderBy: { sortOrder: 'asc' } },
          taskSteps: { orderBy: { sortOrder: 'asc' } },
          labels: { include: { label: true } },
          reminders: true,
        },
      })
      return mapNote(note)
    }),

  unarchive: authedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.note.findFirstOrThrow({ where: { id: input.id, userId: ctx.user.id } })
      const note = await ctx.db.note.update({
        where: { id: input.id },
        data: { status: 'ACTIVE' },
        include: {
          todoItems: { orderBy: { sortOrder: 'asc' } },
          taskSteps: { orderBy: { sortOrder: 'asc' } },
          labels: { include: { label: true } },
          reminders: true,
        },
      })
      return mapNote(note)
    }),

  pin: authedProcedure
    .input(z.object({ id: z.string(), isPinned: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.note.findFirstOrThrow({ where: { id: input.id, userId: ctx.user.id } })
      const note = await ctx.db.note.update({
        where: { id: input.id },
        data: { isPinned: input.isPinned },
        include: {
          todoItems: { orderBy: { sortOrder: 'asc' } },
          taskSteps: { orderBy: { sortOrder: 'asc' } },
          labels: { include: { label: true } },
          reminders: true,
        },
      })
      return mapNote(note)
    }),

  reorder: authedProcedure
    .input(z.object({ id: z.string(), newSortOrder: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.note.findFirstOrThrow({ where: { id: input.id, userId: ctx.user.id } })
      const note = await ctx.db.note.update({
        where: { id: input.id },
        data: { sortOrder: input.newSortOrder },
        include: {
          todoItems: { orderBy: { sortOrder: 'asc' } },
          taskSteps: { orderBy: { sortOrder: 'asc' } },
          labels: { include: { label: true } },
          reminders: true,
        },
      })
      return mapNote(note)
    }),

  reorderGroup: authedProcedure
    .input(z.array(z.object({ id: z.string(), sortOrder: z.string() })))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.$transaction(
        input.map(({ id, sortOrder }) =>
          ctx.db.note.updateMany({
            where: { id, userId: ctx.user.id },
            data: { sortOrder },
          }),
        ),
      )
    }),

  delete: authedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const note = await ctx.db.note.findFirstOrThrow({
        where: { id: input.id, userId: ctx.user.id },
      })
      if (note.status !== 'TRASHED') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Note must be in trash before permanent deletion',
        })
      }
      await ctx.db.note.delete({ where: { id: input.id } })
      return { id: input.id }
    }),

  bulkTrash: authedProcedure
    .input(z.object({ ids: z.array(z.string()) }))
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.db.note.updateMany({
        where: { id: { in: input.ids }, userId: ctx.user.id },
        data: { status: 'TRASHED', trashedAt: new Date(), isPinned: false },
      })
      return { count: result.count }
    }),
})
