import cron from 'node-cron'
import { EventEmitter } from 'events'
import type { Response } from 'express'
import { prisma } from '../db.js'

// In-process SSE connection registry: userId → list of active Response streams
const sseClients = new Map<string, Response[]>()

// Internal event emitter for reminder notifications
export const reminderEmitter = new EventEmitter()

/**
 * Register an SSE client for a user.
 * Returns a cleanup function to call on disconnect.
 */
export function registerSseClient(userId: string, res: Response): () => void {
  const existing = sseClients.get(userId) ?? []
  existing.push(res)
  sseClients.set(userId, existing)

  return () => {
    const clients = sseClients.get(userId) ?? []
    const filtered = clients.filter((r) => r !== res)
    if (filtered.length === 0) {
      sseClients.delete(userId)
    } else {
      sseClients.set(userId, filtered)
    }
  }
}

/**
 * Push an SSE event to all connected clients for a given user.
 */
export function pushToUser(userId: string, event: string, data: unknown): void {
  const clients = sseClients.get(userId) ?? []
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
  for (const res of clients) {
    try {
      res.write(payload)
    } catch {
      // Client disconnected — will be cleaned up by the close handler
    }
  }
}

/**
 * Start the reminder cron job (runs every minute).
 */
export function startReminderCron(): void {
  cron.schedule('* * * * *', async () => {
    try {
      const now = new Date()
      const dueReminders = await prisma.reminder.findMany({
        where: {
          nextOccurrence: { lte: now },
          isAcknowledged: false,
          firedAt: null,
          note: { status: 'ACTIVE' },
        },
        include: {
          note: { select: { id: true, title: true, userId: true } },
        },
      })

      for (const reminder of dueReminders) {
        // Mark as fired
        await prisma.reminder.update({
          where: { id: reminder.id },
          data: { firedAt: now },
        })

        // Push SSE event to user's clients
        pushToUser(reminder.note.userId, 'reminder', {
          reminderId: reminder.id,
          noteId: reminder.note.id,
          noteTitle: reminder.note.title,
          scheduledAt: reminder.scheduledAt.toISOString(),
        })
      }
    } catch (err) {
      console.error('[reminder cron] Error:', err)
    }
  })

  console.log('[reminder service] Cron started — checking every minute')
}

/**
 * Start the trash auto-purge cron job (runs daily at 03:00).
 * Permanently deletes notes that have been in trash for > 30 days.
 */
export function startTrashPurgeCron(): void {
  cron.schedule('0 3 * * *', async () => {
    try {
      const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      const result = await prisma.note.deleteMany({
        where: {
          status: 'TRASHED',
          trashedAt: { lt: cutoff },
        },
      })
      if (result.count > 0) {
        console.log(`[trash purge] Deleted ${result.count} notes`)
      }
    } catch (err) {
      console.error('[trash purge] Error:', err)
    }
  })

  console.log('[trash service] Daily purge cron started (03:00)')
}
