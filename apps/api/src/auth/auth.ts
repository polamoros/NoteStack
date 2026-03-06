import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { openAPI } from 'better-auth/plugins'
import { admin } from 'better-auth/plugins'
import { prisma } from '../db.js'
import { env } from '../env.js'

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),
  baseURL: `http://localhost:${env.PORT}`,
  trustedOrigins: [env.FRONTEND_URL],
  secret: env.BETTER_AUTH_SECRET,
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },
  plugins: [
    admin({
      defaultRole: 'user',
      adminRole: 'admin',
    }),
    openAPI(),
  ],
  user: {
    additionalFields: {
      role: {
        type: 'string',
        defaultValue: 'user',
        input: false,
      },
    },
  },
})

export type Auth = typeof auth
