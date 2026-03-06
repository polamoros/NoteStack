import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, authedProcedure } from '../trpc/trpc.js'
import { createReminderSchema, updateReminderSchema } from '@notes/shared'
import { computeNextOccurrence } from '../services/recurrence.service.js'

function mapReminder(r: any) {
  return {
    ...r,
    scheduledAt: r.scheduledAt.toISOString(),
    nextOccurrence: r.nextOccurrence?.toISOString() ?? null,
    firedAt: r.firedAt?.toISOString() ?? null,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
    note: r.note
      ? {
          id: r.note.id,
          title: r.note.title,
          createdAt: r.note.createdAt?.toISOString(),
          updatedAt: r.note.updatedAt?.toISOString(),
        }
      : undefined,
  }
}

export const remindersRouter = router({
  list: authedProcedure
    .input(z.object({ upcoming: z.boolean().optional() }))
    .query(async ({ ctx, input }) => {
      const reminders = await ctx.db.reminder.findMany({
        where: {
          note: { userId: ctx.user.id },
          ...(input.upcoming ? { nextOccurrence: { gte: new Date() } } : {}),
        },
        include: { note: { select: { id: true, title: true, createdAt: true, updatedAt: true } } },
        orderBy: { nextOccurrence: 'asc' },
      })
      return reminders.map(mapReminder)
    }),

  create: authedProcedure
    .input(createReminderSchema)
    .mutation(async ({ ctx, input }) => {
      await ctx.db.note.findFirstOrThrow({ where: { id: input.noteId, userId: ctx.user.id } })

      const scheduledAt = new Date(input.scheduledAt)
      const nextOccurrence = input.rrule
        ? computeNextOccurrence(input.rrule, scheduledAt, scheduledAt)
        : scheduledAt

      const reminder = await ctx.db.reminder.create({
        data: {
          noteId: input.noteId,
          scheduledAt,
          rrule: input.rrule ?? null,
          nextOccurrence,
        },
        include: { note: { select: { id: true, title: true, createdAt: true, updatedAt: true } } },
      })
      return mapReminder(reminder)
    }),

  update: authedProcedure
    .input(z.object({ id: z.string() }).merge(updateReminderSchema))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input
      const existing = await ctx.db.reminder.findFirstOrThrow({
        where: { id },
        include: { note: { select: { userId: true } } },
      })
      if (existing.note.userId !== ctx.user.id) throw new TRPCError({ code: 'FORBIDDEN' })

      const scheduledAt = data.scheduledAt ? new Date(data.scheduledAt) : existing.scheduledAt
      const rrule = 'rrule' in data ? data.rrule : existing.rrule
      const nextOccurrence = rrule
        ? computeNextOccurrence(rrule, scheduledAt, new Date())
        : scheduledAt

      const reminder = await ctx.db.reminder.update({
        where: { id },
        data: {
          scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : undefined,
          rrule: 'rrule' in data ? data.rrule : undefined,
          nextOccurrence,
          isAcknowledged: false,
          firedAt: null,
        },
        include: { note: { select: { id: true, title: true, createdAt: true, updatedAt: true } } },
      })
      return mapReminder(reminder)
    }),

  acknowledge: authedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.reminder.findFirstOrThrow({
        where: { id: input.id },
        include: { note: { select: { userId: true } } },
      })
      if (existing.note.userId !== ctx.user.id) throw new TRPCError({ code: 'FORBIDDEN' })

      let nextOccurrence: Date | null = null
      if (existing.rrule && existing.nextOccurrence) {
        nextOccurrence = computeNextOccurrence(
          existing.rrule,
          existing.scheduledAt,
          new Date(existing.nextOccurrence.getTime() + 1000), // advance past current
        )
      }

      const reminder = await ctx.db.reminder.update({
        where: { id: input.id },
        data: {
          isAcknowledged: true,
          nextOccurrence,
        },
        include: { note: { select: { id: true, title: true, createdAt: true, updatedAt: true } } },
      })
      return mapReminder(reminder)
    }),

  delete: authedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const reminder = await ctx.db.reminder.findFirstOrThrow({
        where: { id: input.id },
        include: { note: { select: { userId: true } } },
      })
      if (reminder.note.userId !== ctx.user.id) throw new TRPCError({ code: 'FORBIDDEN' })
      await ctx.db.reminder.delete({ where: { id: input.id } })
      return { id: input.id }
    }),
})
