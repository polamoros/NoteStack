import { router } from './trpc.js'
import { notesRouter } from '../routers/notes.js'
import { todoItemsRouter } from '../routers/todoItems.js'
import { taskStepsRouter } from '../routers/taskSteps.js'
import { labelsRouter } from '../routers/labels.js'
import { remindersRouter } from '../routers/reminders.js'
import { searchRouter } from '../routers/search.js'
import { sharingRouter } from '../routers/sharing.js'
import { stacksRouter } from '../routers/stacks.js'
import { adminUsersRouter } from '../routers/admin/users.js'
import { appSettingsRouter } from '../routers/admin/appSettings.js'
import { authConfigRouter } from '../routers/admin/authConfig.js'
import { systemRouter } from '../routers/admin/system.js'

export const appRouter = router({
  notes: notesRouter,
  todoItems: todoItemsRouter,
  taskSteps: taskStepsRouter,
  labels: labelsRouter,
  reminders: remindersRouter,
  search: searchRouter,
  sharing: sharingRouter,
  stacks: stacksRouter,
  admin: router({
    users: adminUsersRouter,
    settings: appSettingsRouter,
    authConfig: authConfigRouter,
    system: systemRouter,
  }),
  // App settings also accessible at root level for public endpoints
  settings: appSettingsRouter,
})

export type AppRouter = typeof appRouter
