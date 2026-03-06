import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { randomUUID } from 'node:crypto'
import { router, authedProcedure, publicProcedure } from '../trpc/trpc.js'

function mapShare(s: any) {
  return {
    id: s.id,
    noteId: s.noteId,
    sharedWithUserId: s.sharedWithUserId,
    sharedWithEmail: s.sharedWithUser?.email ?? null,
    sharedWithName: s.sharedWithUser?.name ?? null,
    permission: s.permission as 'VIEW' | 'EDIT',
    createdAt: s.createdAt.toISOString(),
  }
}

export const sharingRouter = router({
  // ── Public share token management ─────────────────────────────────────────

  createPublicShare: authedProcedure
    .input(z.object({ noteId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const note = await ctx.db.note.findFirst({
        where: { id: input.noteId, userId: ctx.user.id },
        select: { id: true, publicShareToken: true },
      })
      if (!note) throw new TRPCError({ code: 'NOT_FOUND' })
      // Reuse existing token if already set
      const token = note.publicShareToken ?? randomUUID()
      await ctx.db.note.update({
        where: { id: input.noteId },
        data: { publicShareToken: token },
      })
      return { token }
    }),

  removePublicShare: authedProcedure
    .input(z.object({ noteId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.note.findFirstOrThrow({
        where: { id: input.noteId, userId: ctx.user.id },
      })
      await ctx.db.note.update({
        where: { id: input.noteId },
        data: { publicShareToken: null },
      })
      return { ok: true }
    }),

  // ── Public endpoint: get note by share token ───────────────────────────────

  getPublicNote: publicProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ ctx, input }) => {
      const note = await ctx.db.note.findFirst({
        where: { publicShareToken: input.token, status: 'ACTIVE' },
        include: {
          todoItems: { orderBy: { sortOrder: 'asc' } },
          taskSteps: { orderBy: { sortOrder: 'asc' } },
          labels: { include: { label: true } },
        },
      })
      if (!note) throw new TRPCError({ code: 'NOT_FOUND', message: 'Note not found or link has been revoked' })
      return {
        id: note.id,
        title: note.title,
        type: note.type,
        color: note.color,
        content: note.content,
        createdAt: note.createdAt.toISOString(),
        updatedAt: note.updatedAt.toISOString(),
        labels: note.labels.map((nl: any) => nl.label),
        todoItems: note.todoItems.map((i: any) => ({ ...i, createdAt: i.createdAt.toISOString() })),
        taskSteps: note.taskSteps.map((s: any) => ({ ...s, createdAt: s.createdAt.toISOString() })),
      }
    }),

  // ── Per-user sharing ───────────────────────────────────────────────────────

  listShares: authedProcedure
    .input(z.object({ noteId: z.string() }))
    .query(async ({ ctx, input }) => {
      await ctx.db.note.findFirstOrThrow({ where: { id: input.noteId, userId: ctx.user.id } })
      const shares = await ctx.db.noteShare.findMany({
        where: { noteId: input.noteId },
        include: { sharedWithUser: { select: { email: true, name: true } } },
        orderBy: { createdAt: 'asc' },
      })
      // Also return the public share token
      const note = await ctx.db.note.findUnique({
        where: { id: input.noteId },
        select: { publicShareToken: true },
      })
      return {
        shares: shares.map(mapShare),
        publicShareToken: note?.publicShareToken ?? null,
      }
    }),

  shareWithUser: authedProcedure
    .input(z.object({
      noteId: z.string(),
      email: z.string().email(),
      permission: z.enum(['VIEW', 'EDIT']).default('VIEW'),
    }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.note.findFirstOrThrow({ where: { id: input.noteId, userId: ctx.user.id } })
      const targetUser = await ctx.db.user.findUnique({ where: { email: input.email } })
      if (!targetUser) throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' })
      if (targetUser.id === ctx.user.id) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Cannot share with yourself' })
      const share = await ctx.db.noteShare.upsert({
        where: { noteId_sharedWithUserId: { noteId: input.noteId, sharedWithUserId: targetUser.id } },
        create: { noteId: input.noteId, sharedWithUserId: targetUser.id, permission: input.permission },
        update: { permission: input.permission },
        include: { sharedWithUser: { select: { email: true, name: true } } },
      })
      return mapShare(share)
    }),

  removeUserShare: authedProcedure
    .input(z.object({ shareId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const share = await ctx.db.noteShare.findFirst({
        where: { id: input.shareId },
        include: { note: { select: { userId: true } } },
      })
      if (!share) throw new TRPCError({ code: 'NOT_FOUND' })
      if (share.note.userId !== ctx.user.id) throw new TRPCError({ code: 'FORBIDDEN' })
      await ctx.db.noteShare.delete({ where: { id: input.shareId } })
      return { id: input.shareId }
    }),
})
