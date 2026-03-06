import { z } from 'zod'
import { router, adminProcedure } from '../../trpc/trpc.js'

export const adminUsersRouter = router({
  list: adminProcedure
    .input(z.object({
      cursor: z.string().optional(),
      limit: z.number().min(1).max(100).default(20),
    }))
    .query(async ({ ctx, input }) => {
      const users = await ctx.db.user.findMany({
        take: input.limit + 1,
        ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          banned: true,
          banReason: true,
          createdAt: true,
          updatedAt: true,
        },
      })

      let nextCursor: string | undefined
      if (users.length > input.limit) {
        const next = users.pop()
        nextCursor = next?.id
      }

      return {
        users: users.map((u) => ({
          ...u,
          createdAt: u.createdAt.toISOString(),
          updatedAt: u.updatedAt.toISOString(),
        })),
        nextCursor,
      }
    }),

  setRole: adminProcedure
    .input(z.object({ userId: z.string(), role: z.enum(['user', 'admin']) }))
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.user.update({
        where: { id: input.userId },
        data: { role: input.role },
        select: { id: true, name: true, email: true, role: true },
      })
      return user
    }),

  setBanned: adminProcedure
    .input(z.object({
      userId: z.string(),
      banned: z.boolean(),
      reason: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.user.update({
        where: { id: input.userId },
        data: {
          banned: input.banned,
          banReason: input.banned ? (input.reason ?? null) : null,
          banExpires: null,
        },
        select: { id: true, name: true, email: true, banned: true, banReason: true },
      })
      return user
    }),

  delete: adminProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Prevent self-deletion
      if (input.userId === ctx.user.id) {
        throw new Error('Cannot delete your own account')
      }
      await ctx.db.user.delete({ where: { id: input.userId } })
      return { id: input.userId }
    }),

  stats: adminProcedure.query(async ({ ctx }) => {
    const [userCount, noteCount, dbSizeResult] = await Promise.all([
      ctx.db.user.count(),
      ctx.db.note.count(),
      ctx.db.$queryRaw<Array<{ size: string }>>`
        SELECT pg_size_pretty(pg_database_size(current_database())) as size
      `,
    ])

    return {
      userCount,
      noteCount,
      dbSize: dbSizeResult[0]?.size ?? 'unknown',
    }
  }),
})
