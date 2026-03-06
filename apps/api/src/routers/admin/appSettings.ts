import { z } from 'zod'
import { router, adminProcedure, publicProcedure } from '../../trpc/trpc.js'

const PUBLIC_SETTINGS = ['instanceName', 'logoUrl', 'registrationOpen', 'setupComplete'] as const

import type { PrismaClient } from '@prisma/client'

async function getSetting(db: PrismaClient, key: string): Promise<string | null> {
  const s = await db.appSetting.findUnique({ where: { key } })
  return s?.value ?? null
}

async function setSetting(db: PrismaClient, key: string, value: string): Promise<void> {
  await db.appSetting.upsert({
    where: { key },
    create: { key, value },
    update: { value },
  })
}

export const appSettingsRouter = router({
  // Public: needed by login page and setup wizard
  getPublic: publicProcedure.query(async ({ ctx }) => {
    const settings = await ctx.db.appSetting.findMany({
      where: { key: { in: [...PUBLIC_SETTINGS] } },
    })
    const map: Record<string, string> = {}
    settings.forEach((s) => { map[s.key] = s.value })
    return {
      instanceName: map.instanceName ?? 'Notes',
      logoUrl: map.logoUrl ?? null,
      registrationOpen: map.registrationOpen === 'true',
      setupComplete: map.setupComplete === 'true',
    }
  }),

  update: adminProcedure
    .input(z.object({
      instanceName: z.string().min(1).max(100).optional(),
      logoUrl: z.string().nullable().optional(),  // URL or base64 data URI
      registrationOpen: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const updates: Promise<void>[] = []
      if (input.instanceName !== undefined) {
        updates.push(setSetting(ctx.db, 'instanceName', input.instanceName))
      }
      if (input.logoUrl !== undefined) {
        updates.push(setSetting(ctx.db, 'logoUrl', input.logoUrl ?? ''))
      }
      if (input.registrationOpen !== undefined) {
        updates.push(setSetting(ctx.db, 'registrationOpen', String(input.registrationOpen)))
      }
      await Promise.all(updates)
      return { ok: true }
    }),

  // Setup wizard: complete initial setup
  completeSetup: publicProcedure
    .input(z.object({
      instanceName: z.string().min(1).max(100).optional(),
    }).optional())
    .mutation(async ({ ctx, input }) => {
      const setupComplete = await getSetting(ctx.db, 'setupComplete')
      if (setupComplete === 'true') {
        throw new Error('Setup already completed')
      }
      await setSetting(ctx.db, 'setupComplete', 'true')
      if (input?.instanceName && input.instanceName !== 'Notes') {
        await setSetting(ctx.db, 'instanceName', input.instanceName)
      }
      return { ok: true }
    }),

  checkSetup: publicProcedure.query(async ({ ctx }) => {
    const [setupComplete, userCount] = await Promise.all([
      getSetting(ctx.db, 'setupComplete'),
      ctx.db.user.count(),
    ])
    return {
      setupComplete: setupComplete === 'true' || userCount > 0,
      hasUsers: userCount > 0,
    }
  }),
})
