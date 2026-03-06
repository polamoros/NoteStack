import { z } from 'zod'
import { router, authedProcedure } from '../trpc/trpc.js'

export const searchRouter = router({
  query: authedProcedure
    .input(z.object({ q: z.string().min(1), limit: z.number().min(1).max(50).default(20) }))
    .query(async ({ ctx, input }) => {
      const q = `%${input.q}%`
      const notes = await ctx.db.$queryRaw<Array<{ id: string }>>`
        SELECT DISTINCT n.id
        FROM "Note" n
        LEFT JOIN "TodoItem" ti ON ti."noteId" = n.id
        LEFT JOIN "TaskStep" ts ON ts."noteId" = n.id
        WHERE n."userId" = ${ctx.user.id}
          AND n.status = 'ACTIVE'
          AND (
            n.title ILIKE ${q}
            OR n.content ILIKE ${q}
            OR ti.text ILIKE ${q}
            OR ts.title ILIKE ${q}
          )
        LIMIT ${input.limit}
      `

      const ids = notes.map((n) => n.id)
      if (ids.length === 0) return []

      const fullNotes = await ctx.db.note.findMany({
        where: { id: { in: ids } },
        include: {
          todoItems: { orderBy: { sortOrder: 'asc' } },
          taskSteps: { orderBy: { sortOrder: 'asc' } },
          labels: { include: { label: true } },
          reminders: true,
          shares: { include: { sharedWithUser: { select: { id: true, name: true, image: true } } } },
        },
      })

      return fullNotes.map((note) => ({
        ...note,
        labels: note.labels.map((nl) => nl.label),
        // Normalise sharedWith so NoteCard doesn't crash on note.sharedWith.length
        sharedWith: note.shares.map((s) => ({
          userId: s.sharedWithUserId ?? '',
          name: s.sharedWithUser?.name ?? null,
          image: s.sharedWithUser?.image ?? null,
          permission: s.permission,
        })),
        createdAt: note.createdAt.toISOString(),
        updatedAt: note.updatedAt.toISOString(),
        trashedAt: note.trashedAt?.toISOString() ?? null,
        todoItems: note.todoItems.map((i) => ({ ...i, createdAt: i.createdAt.toISOString() })),
        taskSteps: note.taskSteps.map((s) => ({ ...s, createdAt: s.createdAt.toISOString() })),
        reminders: note.reminders.map((r) => ({
          ...r,
          scheduledAt: r.scheduledAt.toISOString(),
          nextOccurrence: r.nextOccurrence?.toISOString() ?? null,
          firedAt: r.firedAt?.toISOString() ?? null,
          createdAt: r.createdAt.toISOString(),
          updatedAt: r.updatedAt.toISOString(),
        })),
      }))
    }),
})
