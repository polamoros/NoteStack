import './env.js' // validate env first
import express from 'express'
import cors from 'cors'
import { createExpressMiddleware } from '@trpc/server/adapters/express'
import { env } from './env.js'
import { auth } from './auth/auth.js'
import { createContext } from './trpc/context.js'
import { appRouter } from './trpc/router.js'
import { sseHandler } from './sse/handler.js'
import { startReminderCron, startTrashPurgeCron } from './services/reminder.service.js'
import { toNodeHandler } from 'better-auth/node'

const app = express()

// CORS
app.use(cors({
  origin: env.FRONTEND_URL,
  credentials: true,
}))

app.use(express.json({ limit: '10mb' }))

// Health check (no auth required)
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', version: process.env.npm_package_version ?? '0.1.0' })
})

// better-auth routes at /api/auth/**
app.all('/api/auth/*', toNodeHandler(auth))

// SSE endpoint for real-time reminder notifications
app.get('/api/events', sseHandler)

// tRPC API
app.use('/api/trpc', createExpressMiddleware({
  router: appRouter,
  createContext,
  onError: ({ error, path }) => {
    if (error.code === 'INTERNAL_SERVER_ERROR') {
      console.error(`[tRPC] Error on ${path}:`, error)
    }
  },
}))

// Start background jobs
startReminderCron()
startTrashPurgeCron()

app.listen(env.PORT, () => {
  console.log(`🚀 API server running on http://localhost:${env.PORT}`)
  console.log(`   Auth:  http://localhost:${env.PORT}/api/auth`)
  console.log(`   tRPC:  http://localhost:${env.PORT}/api/trpc`)
  console.log(`   Events: http://localhost:${env.PORT}/api/events`)
})
