import type { Request, Response } from 'express'
import { auth } from '../auth/auth.js'
import { registerSseClient } from '../services/reminder.service.js'

export async function sseHandler(req: Request, res: Response): Promise<void> {
  const session = await auth.api.getSession({ headers: req.headers as unknown as Headers })
  if (!session) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  const userId = session.user.id

  // SSE headers
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no') // Disable nginx buffering
  res.flushHeaders()

  // Send initial connected event
  res.write('event: connected\ndata: {"status":"ok"}\n\n')

  // Register client and get cleanup function
  const cleanup = registerSseClient(userId, res)

  // Heartbeat every 30 seconds to keep connection alive through proxies
  const heartbeat = setInterval(() => {
    try {
      res.write(': heartbeat\n\n')
    } catch {
      clearInterval(heartbeat)
    }
  }, 30_000)

  // Cleanup on disconnect
  req.on('close', () => {
    clearInterval(heartbeat)
    cleanup()
  })
}
