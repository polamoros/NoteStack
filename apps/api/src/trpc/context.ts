import type { Request, Response } from 'express'
import { auth } from '../auth/auth.js'
import { prisma } from '../db.js'

export async function createContext({ req, res }: { req: Request; res: Response }) {
  const session = await auth.api.getSession({ headers: req.headers as Headers })

  return {
    req,
    res,
    db: prisma,
    session: session?.session ?? null,
    user: session?.user ?? null,
  }
}

export type Context = Awaited<ReturnType<typeof createContext>>
