import { z } from 'zod'
import { router, adminProcedure, publicProcedure } from '../../trpc/trpc.js'

function mapProvider(p: any) {
  return {
    ...p,
    createdAt: p.createdAt.toISOString(),
    // Never expose clientSecret to frontend
    clientSecret: '***',
  }
}

export const authConfigRouter = router({
  // Public: frontend needs to know which OIDC providers are available for login buttons
  listEnabled: publicProcedure.query(async ({ ctx }) => {
    const providers = await ctx.db.oidcProvider.findMany({
      where: { enabled: true },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    })
    return providers
  }),

  list: adminProcedure.query(async ({ ctx }) => {
    const providers = await ctx.db.oidcProvider.findMany({
      orderBy: { name: 'asc' },
    })
    return providers.map(mapProvider)
  }),

  create: adminProcedure
    .input(z.object({
      name: z.string().min(1).max(50),
      issuerUrl: z.string().url(),
      clientId: z.string().min(1),
      clientSecret: z.string().min(1),
      scopes: z.string().default('openid email profile'),
      enabled: z.boolean().default(true),
    }))
    .mutation(async ({ ctx, input }) => {
      const provider = await ctx.db.oidcProvider.create({ data: input })
      return mapProvider(provider)
    }),

  update: adminProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().min(1).max(50).optional(),
      issuerUrl: z.string().url().optional(),
      clientId: z.string().min(1).optional(),
      clientSecret: z.string().min(1).optional(),
      scopes: z.string().optional(),
      enabled: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input
      const provider = await ctx.db.oidcProvider.update({ where: { id }, data })
      return mapProvider(provider)
    }),

  delete: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.oidcProvider.delete({ where: { id: input.id } })
      return { id: input.id }
    }),
})
