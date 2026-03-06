# Notes App — Self-Hosted Google Keep Clone

## Context
Building a production-quality, self-hosted personal notes app designed to be shared publicly (e.g. Reddit self-hosting community). Multi-user, with admin panel, configurable auth. Stack: React + TypeScript (frontend), Node.js + TypeScript (backend), PostgreSQL via Docker Compose.

---

## Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Monorepo | pnpm workspaces | Shared types, single lockfile |
| Database | PostgreSQL + Prisma | Multi-user concurrent writes, industry standard for self-hosting |
| Deployment | Docker Compose | Standard for self-hosted apps (Gitea, Bookstack pattern) |
| API | tRPC v11 | End-to-end TS types, no DTO duplication |
| Auth | better-auth | Built-in email/password + OIDC plugin, Prisma adapter, admin plugin, tRPC adapter |
| Frontend build | Vite + React 18 + TS | Fast HMR, stable |
| UI components | shadcn/ui + Tailwind CSS v3 | Radix primitives, copy-owned |
| State (server) | TanStack Query v5 | Cache + optimistic updates |
| State (UI) | Zustand | Minimal boilerplate |
| Rich text | Tiptap v2 | Headless, React-first, extensible |
| Drag/Drop | dnd-kit (@dnd-kit/sortable) | Modern, accessible |
| Sort order | fractional-indexing | One DB write per reorder |
| Reminders | node-cron + SSE | Minute-level polling, EventSource push |
| Recurrence | rrule (RFC 5545) | Standard RRULE strings |

---

## Directory Structure

```
notes/
├── package.json                    # pnpm workspace root
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── .gitignore
├── docker-compose.yml              # PostgreSQL + api + web services
├── docker-compose.dev.yml          # Dev override (mounts src, hot reload)
├── README.md
├── packages/
│   └── shared/                     # @notes/shared — Zod schemas + TS types
│       ├── package.json
│       └── src/
│           ├── types/note.ts, reminder.ts, label.ts, user.ts
│           └── validators/note.ts, reminder.ts, label.ts
└── apps/
    ├── api/                        # @notes/api — Express + tRPC + Prisma
    │   ├── package.json
    │   ├── Dockerfile
    │   ├── prisma/
    │   │   ├── schema.prisma
    │   │   └── migrations/
    │   ├── .env.example
    │   └── src/
    │       ├── index.ts                  # Express entry, mounts tRPC + better-auth
    │       ├── env.ts                    # Typed env (zod)
    │       ├── db.ts                     # Prisma singleton
    │       ├── auth/
    │       │   ├── auth.ts               # better-auth instance config
    │       │   └── middleware.ts         # session → tRPC context
    │       ├── trpc/
    │       │   ├── context.ts            # { db, session, user }
    │       │   ├── router.ts             # Root router
    │       │   └── trpc.ts               # initTRPC, authedProcedure, adminProcedure
    │       ├── routers/
    │       │   ├── notes.ts
    │       │   ├── labels.ts
    │       │   ├── reminders.ts
    │       │   ├── todoItems.ts
    │       │   ├── taskSteps.ts
    │       │   ├── search.ts
    │       │   └── admin/
    │       │       ├── users.ts          # list, invite, disable, promote, reset password
    │       │       ├── authConfig.ts     # read/write OIDC settings from DB
    │       │       ├── appSettings.ts    # instance name, logo, registration toggle
    │       │       └── system.ts         # DB size, user count, version, health
    │       ├── services/
    │       │   ├── reminder.service.ts
    │       │   ├── recurrence.service.ts
    │       │   └── trash.service.ts
    │       └── sse/handler.ts
    └── web/                        # @notes/web — Vite + React
        ├── package.json
        ├── Dockerfile
        ├── vite.config.ts
        ├── tailwind.config.ts
        ├── components.json
        └── src/
            ├── main.tsx, App.tsx
            ├── api/client.ts             # tRPC client (session cookie based)
            ├── store/ui.store.ts, filter.store.ts
            ├── pages/
            │   ├── LoginPage.tsx         # email/password + OIDC button(s)
            │   ├── NotesPage.tsx
            │   ├── ArchivePage.tsx
            │   ├── TrashPage.tsx
            │   ├── RemindersPage.tsx
            │   └── LabelPage.tsx
            ├── pages/admin/
            │   ├── AdminLayout.tsx       # Admin sidebar nav + role guard
            │   ├── UsersPage.tsx         # User table, invite, disable, roles
            │   ├── AuthConfigPage.tsx    # OIDC provider setup form
            │   ├── AppSettingsPage.tsx   # Instance name, logo, registration
            │   └── SystemPage.tsx        # Health dashboard
            └── components/
                ├── ui/                   # shadcn generated
                ├── layout/AppShell, Sidebar, TopBar, NotificationBell
                ├── notes/NoteGrid, NoteCard, NoteEditor, NoteCreateBar, NoteActions, ColorPicker, SizePicker
                ├── reminders/ReminderPicker, RecurrencePicker, ReminderBadge
                └── labels/LabelManager, LabelSelector
```

---

## Database Schema (Prisma + PostgreSQL)

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// better-auth manages User, Session, Account, Verification tables automatically
// via its Prisma adapter — no manual schema needed for those.

model Note {
  id        String   @id @default(cuid())
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  userId    String                        // owner — required for multi-user
  title     String   @default("")
  type      String   @default("RICH")    // "RICH" | "TODO" | "TASK"
  color     String   @default("DEFAULT") // 11 color options
  size      String   @default("AUTO")    // "SMALL" | "MEDIUM" | "LARGE" | "AUTO"
  status    String   @default("ACTIVE")  // "ACTIVE" | "ARCHIVED" | "TRASHED"
  isPinned  Boolean  @default(false)
  content   String?                       // Tiptap JSON for RICH type
  sortOrder String   @default("")         // fractional index
  trashedAt DateTime?
  todoItems TodoItem[]
  taskSteps TaskStep[]
  labels    NoteLabel[]
  reminders Reminder[]

  @@index([userId, status])
  @@index([userId, isPinned])
}

model TodoItem {
  id        String  @id @default(cuid())
  noteId    String
  note      Note    @relation(fields: [noteId], references: [id], onDelete: Cascade)
  text      String
  isChecked Boolean @default(false)
  sortOrder String  @default("")
}

model TaskStep {
  id          String  @id @default(cuid())
  noteId      String
  note        Note    @relation(fields: [noteId], references: [id], onDelete: Cascade)
  title       String
  description String?
  isComplete  Boolean @default(false)
  sortOrder   String  @default("")
}

model Label {
  id        String      @id @default(cuid())
  userId    String                         // per-user labels
  name      String
  color     String?
  notes     NoteLabel[]
  @@unique([userId, name])
}

model NoteLabel {
  noteId  String
  labelId String
  note    Note   @relation(fields: [noteId], references: [id], onDelete: Cascade)
  label   Label  @relation(fields: [labelId], references: [id], onDelete: Cascade)
  @@id([noteId, labelId])
}

model Reminder {
  id             String   @id @default(cuid())
  noteId         String
  note           Note     @relation(fields: [noteId], references: [id], onDelete: Cascade)
  scheduledAt    DateTime
  rrule          String?
  nextOccurrence DateTime?
  isAcknowledged Boolean  @default(false)
  firedAt        DateTime?
  @@index([nextOccurrence])
}

// App-wide settings stored in DB (editable from admin panel)
model AppSetting {
  key       String @id
  value     String
  updatedAt DateTime @updatedAt
}

// OIDC provider configuration (stored encrypted or plaintext based on env)
model OidcProvider {
  id           String  @id @default(cuid())
  name         String  @unique  // e.g. "Google", "Authentik"
  issuerUrl    String
  clientId     String
  clientSecret String           // consider encrypting at rest
  enabled      Boolean @default(true)
  createdAt    DateTime @default(now())
}
```

**PostgreSQL FTS**: Use `pg_trgm` extension + GIN index on `Note.title || ' ' || Note.content` instead of FTS5. Prisma raw query for search.

---

## Auth Architecture (better-auth)

`better-auth` is configured in `apps/api/src/auth/auth.ts`:

```ts
export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  emailAndPassword: { enabled: true },
  plugins: [
    openIDConnect({
      // providers loaded dynamically from OidcProvider table at startup
    }),
    admin(),                   // adds role field, user management API
  ],
  trustedOrigins: [process.env.FRONTEND_URL],
})
```

- Sessions are **cookie-based** (better-auth default, no localStorage JWT)
- better-auth mounts its own routes at `/api/auth/**` (login, callback, session, signout)
- tRPC context reads session from `auth.api.getSession({ headers: req.headers })`
- `authedProcedure` — requires `ctx.session`
- `adminProcedure` — requires `ctx.session.user.role === 'admin'`
- First registered user is automatically promoted to admin
- Admin panel at `/admin` — client-side route guard checks role

**Login page flow:**
1. Email/password form → POST `/api/auth/sign-in/email`
2. OIDC buttons (one per enabled `OidcProvider`) → redirect to `/api/auth/sign-in/oidc/:providerId`
3. After first launch, shows setup wizard (admin creates first account)

---

## API Design (tRPC routers)

All note/label/reminder routes are scoped to `ctx.session.userId` — users can only see their own data.

- `notes`: list, get, create, update, delete (hard, trash only), trash, restore, archive, unarchive, pin, reorder, bulkTrash
- `todoItems`: create, update, delete, reorder
- `taskSteps`: create, update, delete, reorder
- `labels`: list, create, update, delete, attach, detach
- `reminders`: list, create, update, acknowledge, delete
- `search`: query (pg_trgm)
- `admin.users`: list, invite (send email or get invite link), disable/enable, promote/demote admin, impersonate
- `admin.authConfig`: listProviders, createProvider, updateProvider, deleteProvider, toggleProvider
- `admin.appSettings`: get, update (instance name, logo URL, open registration, default theme)
- `admin.system`: health (db ping, uptime), stats (user count, note count, db size)

---

## Key Design Decisions

**Reminders (SSE):**
node-cron fires every minute → queries due reminders per user. SSE endpoint `/api/events` is per-session (reads `userId` from session cookie). Each connected client gets their own SSE stream. In-process `Map<userId, Response[]>` tracks active connections.

**Recurrence:**
`rrule` npm package. `scheduledAt` = DTSTART. `nextOccurrence` cached in DB. On acknowledge: advance via `rule.after(new Date())`. If null → reminder complete.

**Masonry layout:**
CSS `columns` property. Zero JS. Note sizes:
- `SMALL`: `min-height: 80px`, `MEDIUM`: `min-height: 160px`, `LARGE`: `min-height: 280px`, `AUTO`: natural

**Drag-to-reorder:**
dnd-kit + `fractional-indexing`. Single DB write per reorder. Optimistic update via TanStack Query.

**Admin first-run setup:**
On fresh install, if no users exist, the app shows a setup wizard (`/setup`) to create the first admin account. After that, `/setup` redirects to home. Controlled by `AppSetting { key: 'setupComplete', value: 'true' }`.

---

## Docker Compose

```yaml
# docker-compose.yml
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: notes
      POSTGRES_USER: notes
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U notes"]

  api:
    build: ./apps/api
    environment:
      DATABASE_URL: postgresql://notes:${POSTGRES_PASSWORD}@db:5432/notes
      BETTER_AUTH_SECRET: ${BETTER_AUTH_SECRET}
      FRONTEND_URL: ${FRONTEND_URL:-http://localhost:5173}
    depends_on:
      db:
        condition: service_healthy
    ports:
      - "3001:3001"

  web:
    build: ./apps/web
    ports:
      - "3000:80"
    environment:
      VITE_API_URL: ${API_URL:-http://localhost:3001}

volumes:
  postgres_data:
```

`.env.example` ships with the repo. README explains: copy to `.env`, set passwords, run `docker compose up -d`.

---

## Implementation Phases

1. **Monorepo + infra** — workspace, shared package, docker-compose, Prisma + PostgreSQL, tRPC base wiring
2. **Auth + Admin foundation** — better-auth setup (email/password), setup wizard, admin role, admin panel shell with user management
3. **OIDC config** — OidcProvider model, admin AuthConfig page, dynamic OIDC registration in better-auth, OIDC login button on login page
4. **Core Notes CRUD** — notes router (userId scoped), NoteCreateBar, NoteCard (RICH type), NoteGrid (CSS masonry), NoteEditor modal, AppShell/Sidebar/TopBar
5. **Note types** — todoItems + taskSteps routers, Tiptap editor, TODO/TASK card + editor variants
6. **Colors, Sizes, Pin, Drag Reorder** — ColorPicker, SizePicker, dnd-kit + fractional-indexing, pinned sections
7. **Labels** — labels router, LabelManager, LabelSelector, LabelChips, LabelPage, Sidebar nav
8. **Search** — pg_trgm GIN index, search router, debounced SearchInput
9. **Reminders** — reminders router, ReminderPicker + RecurrencePicker UI, ReminderBadge, SSE (per-user), node-cron, RemindersPage
10. **Recurrence** — rrule engine, advanceReminder, human-readable labels
11. **Admin polish + system info** — app settings page, system health page, trash auto-purge cron
12. **Production hardening** — Dockerfiles optimized (multi-stage), nginx config for web, README with complete setup guide, health endpoint

---

## Critical Files

- `apps/api/prisma/schema.prisma` — foundation
- `apps/api/src/auth/auth.ts` — better-auth instance, OIDC, admin plugin
- `apps/api/src/trpc/router.ts` — complete API contract
- `apps/api/src/services/reminder.service.ts` — cron + per-user SSE
- `apps/web/src/components/notes/NoteGrid.tsx` — masonry + dnd-kit
- `apps/web/src/pages/admin/AuthConfigPage.tsx` — OIDC provider management
- `docker-compose.yml` — deployment entry point

---

## Verification

```bash
# Dev (hot reload)
pnpm dev

# Or Docker (production-like)
cp .env.example .env   # fill in POSTGRES_PASSWORD, BETTER_AUTH_SECRET
docker compose up -d
docker compose exec api npx prisma migrate deploy

# Test checklist:
# 1. /setup wizard — create admin account
# 2. Login with email/password
# 3. Admin panel: create OIDC provider (test with Authentik/Google)
# 4. Login via OIDC
# 5. Admin: invite second user, disable them, promote to admin
# 6. App settings: change instance name — verify reflected on login page
# 7. Create notes (RICH, TODO, TASK), change colors/sizes
# 8. Drag reorder, pin notes
# 9. Archive → archive page → unarchive
# 10. Trash → 30-day countdown displayed → hard delete
# 11. Labels: create, attach, filter
# 12. Search across title + content
# 13. Reminder: set for 1 min from now → SSE toast fires → acknowledge → advance rrule
# 14. Recurrent reminder: acknowledge 3 times → confirm nextOccurrence advances correctly
# 15. System page: verify DB size, user count, uptime
# 16. docker compose down && docker compose up → data persists from postgres_data volume
```
