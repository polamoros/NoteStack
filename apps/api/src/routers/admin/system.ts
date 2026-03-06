import { router, adminProcedure } from '../../trpc/trpc.js'

const startTime = Date.now()

export const systemRouter = router({
  health: adminProcedure.query(async ({ ctx }) => {
    let dbOk = false
    try {
      await ctx.db.$queryRaw`SELECT 1`
      dbOk = true
    } catch {}

    return {
      status: dbOk ? 'ok' : 'degraded',
      uptime: Math.floor((Date.now() - startTime) / 1000),
      db: dbOk ? 'connected' : 'error',
      version: process.env.npm_package_version ?? '0.1.0',
      nodeVersion: process.version,
    }
  }),

  stats: adminProcedure.query(async ({ ctx }) => {
    const [userCount, noteCount, reminderCount, dbSizeResult] = await Promise.all([
      ctx.db.user.count(),
      ctx.db.note.count(),
      ctx.db.reminder.count(),
      ctx.db.$queryRaw<Array<{ size: string }>>`
        SELECT pg_size_pretty(pg_database_size(current_database())) as size
      `,
    ])

    return {
      userCount,
      noteCount,
      reminderCount,
      dbSize: dbSizeResult[0]?.size ?? 'unknown',
    }
  }),
})
