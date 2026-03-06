# NoteStack — Developer Context for Claude

> Self-hosted Google Keep–style notes app. Full-stack TypeScript monorepo.

---

## Stack at a Glance

| Layer | Tech |
|-------|------|
| Runtime | Node.js 22 (via nvm) |
| Monorepo | pnpm workspaces (`apps/*`, `packages/*`) |
| API | Express 4 + **tRPC 11** + Prisma 6 + PostgreSQL |
| Auth | **better-auth 1.x** (email/password + OIDC plugins) |
| Frontend | Vite 6 + React 18 + React Router 7 |
| State | Zustand 5 (UI/selections), TanStack Query (server) |
| Editor | TipTap 2.27 (ProseMirror-based rich text) |
| DnD | dnd-kit 6 |
| UI | Radix UI primitives + Tailwind CSS 3 + Lucide icons |
| Validation | Zod (shared package + API) |

---

## Monorepo Layout

```
notes/
├── apps/
│   ├── api/                  Express/tRPC server
│   │   ├── prisma/schema.prisma
│   │   ├── src/
│   │   │   ├── index.ts      Entry point (Express, cron jobs, SSE)
│   │   │   ├── auth/auth.ts  better-auth initialization
│   │   │   ├── trpc/
│   │   │   │   ├── trpc.ts   Procedure factories (public/authed/admin)
│   │   │   │   ├── context.ts Request context (db, session, user)
│   │   │   │   └── router.ts Root router (imports all sub-routers)
│   │   │   └── routers/
│   │   │       ├── notes.ts, stacks.ts, labels.ts, reminders.ts
│   │   │       ├── sharing.ts, search.ts, todoItems.ts, taskSteps.ts
│   │   │       └── admin/  (users.ts, authConfig.ts, appSettings.ts, system.ts)
│   └── web/                  Vite/React frontend
│       ├── index.html        References /favicon.svg, title "Notes"
│       ├── public/           Static assets (favicon.svg)
│       ├── src/
│       │   ├── App.tsx       Routes + AuthGuard + theme sync
│       │   ├── main.tsx      QueryClient + tRPC provider
│       │   ├── api/client.ts tRPC httpBatchLink setup
│       │   ├── lib/
│       │   │   ├── auth-client.ts  better-auth createAuthClient
│       │   │   └── utils.ts        cn(), getNoteColorStyle(), formatReminderDate()
│       │   ├── store/
│       │   │   ├── ui.store.ts     theme | sidebarOpen | viewMode | selectedNoteIds
│       │   │   └── filter.store.ts searchQuery | activeLabelId
│       │   ├── styles/globals.css  CSS variables + Tiptap + scrollbar
│       │   ├── components/
│       │   │   ├── layout/         AppShell, Sidebar, TopBar
│       │   │   ├── notes/          NoteCard, NoteGrid, NoteEditor*, NoteActions,
│       │   │   │                   NoteCreateBar, NoteShareDialog, ColorPicker, SizePicker
│       │   │   ├── labels/         LabelIcon, LabelSelector, LabelManager
│       │   │   ├── reminders/      ReminderPicker, RecurrencePicker
│       │   │   └── ui/             Radix UI wrappers (button, dialog, dropdown, toast…)
│       │   └── pages/
│       │       ├── LoginPage.tsx   Sign in + sign up + OIDC buttons
│       │       ├── NotesPage.tsx   Main notes grid
│       │       ├── StackPage.tsx   Stack-filtered notes
│       │       ├── LabelPage.tsx   Label-filtered notes
│       │       ├── RemindersPage.tsx
│       │       ├── ArchivePage.tsx, TrashPage.tsx
│       │       ├── PublicNotePage.tsx  Unauthenticated share view
│       │       └── admin/          AdminLayout, UsersPage, AuthConfigPage, AppSettingsPage, SystemPage
└── packages/
    └── shared/src/
        ├── types/   note.ts, stack.ts, label.ts, reminder.ts, user.ts
        └── validators/  note.ts, stack.ts, label.ts, reminder.ts  (Zod schemas)
```

---

## Key Architectural Patterns

### tRPC Procedures

```ts
// trpc/trpc.ts
publicProcedure   // no auth required
authedProcedure   // throws UNAUTHORIZED if no session
adminProcedure    // throws FORBIDDEN if role !== 'admin'
```

### Context per Request

```ts
// trpc/context.ts
{ req, res, db: PrismaClient, session, user }
```

### Auth (better-auth)

- Email/password enabled (no email verification required by default)
- Admin plugin: first registered user auto-promoted to `admin` role
- OIDC providers stored in `OidcProvider` table; must be configured at server
  startup via `auth.ts` to actually work with `authClient.signIn.social()`
- Session stored in `Session` table; read via `headers` on every tRPC request

### Prisma / DB

- Run `prisma db push --accept-data-loss` (not `migrate dev`) — avoids interactive prompt
- Use node path: `export PATH="$HOME/.nvm/versions/node/v22.19.0/bin:$PATH"`
- `mapNote()` converts Prisma `Date` objects → ISO strings + flattens relations
- All user-owned models filter by `userId: ctx.user.id` for authorization

### Frontend API client

```ts
// api/client.ts
trpc.notes.list.useQuery({ status: 'ACTIVE', stackId: '...' })
trpc.notes.update.useMutation({ onSuccess: () => qc.invalidateQueries(...) })
```

### Zustand Stores

```ts
// ui.store.ts (persisted: theme, viewMode, sidebarOpen, gridColumns)
theme: 'light' | 'dark' | 'system'
viewMode: 'grid' | 'list'
sidebarOpen: boolean
gridColumns: number         // 0 = auto CSS grid; 1-6 = fixed columns
editorOpen: boolean         // transient
selectedNoteIds: string[]   // transient
// Actions:
toggleNoteSelection(id), clearNoteSelection(), selectAllNotes(ids[])
setGridColumns(cols), setViewMode(mode), setTheme(theme)
```

### Lucide Icon Picker Pattern

Used in `LabelManager.tsx` for label icon selection:
```ts
import * as LucideIcons from 'lucide-react'
import type { LucideProps } from 'lucide-react'
// Dynamic access:
const Icon = (LucideIcons as unknown as Record<string, React.ComponentType<LucideProps>>)[iconName]
```
Same pattern as `LabelIcon.tsx`. Filter an `ICON_LIST` array of `{ name, label }` by search string.

---

## Note Data Model

```
Note
├── type: RICH | TODO | TASK
├── color: DEFAULT | RED | ORANGE | YELLOW | GREEN | TEAL | BLUE | PURPLE | PINK | BROWN | GRAY
├── size: SMALL | MEDIUM | LARGE | AUTO | "WxH" (custom pixels, e.g. "320x200")
│         └─ legacy height-only: "320" (numeric string = 320px height)
├── status: ACTIVE | ARCHIVED | TRASHED
├── stackId: string | null  (null = inbox)
├── content: Tiptap JSON string (RICH notes only)
├── todoItems[]: { text, isChecked, sortOrder }
├── taskSteps[]: { title, isComplete, sortOrder }
├── labels[]: { id, name, color, icon }  (NoteLabel join)
├── reminders[]: { scheduledAt, rrule, nextOccurrence, isAcknowledged }
├── shares[]: { sharedWithUserId, sharedWith: {name, image}, permission }
│   └─ sharedWith on Note type: { userId, name|null, image|null }[]
└── publicShareToken: string | null  (public link sharing)
```

**Sort order**: `fractional-indexing` (string keys like `"a0"`, `"a1m"`) — O(1) reorder

**Size parsing** (NoteCard.tsx):
```ts
"320x200"  → { width: 320, height: 200 }  // bidirectional resize
"320"      → { width: null, height: 320 }  // legacy height-only
"SMALL"    → { width: null, height: null } // named CSS class
```

---

## Recurring Reminders

- RFC 5545 RRULE stored in `reminder.rrule`
- `nextOccurrence` cached in DB for efficient querying
- Server cron (`node-cron`) fires due reminders every minute via SSE endpoint
- Client subscribes via `useSSE` hook → shows toast notification

---

## Theming

```css
/* globals.css: CSS variables for light/dark mode */
:root { --background: ...; --note-red: 0 96% 89%; ... }
.dark { --background: ...; --note-red: 0 62% 23%; ... }
```

- App.tsx syncs `<html class="dark">` from Zustand `theme` state
- Tailwind `dark:` variants read `html.dark`

### Note Colors

Light: Tailwind -200 level pastels
Dark: Deep, saturated -800-level variants
Rendered via `getNoteColorStyle(color)` in `utils.ts` → `{ className, style }`

---

## Tiptap Rich Editor

- **Extensions**: StarterKit (headings 1-3, codeBlock, hrule, lists, bold, italic…), Placeholder, Link, custom `ImageNode`, custom `AudioNode`
- **Storage**: JSON document serialized to string (`JSON.stringify(editor.getJSON())`)
- **Card preview**: `RichNode` / `RichInline` functions in NoteCard.tsx converts Tiptap JSON → React JSX. Handles: paragraph, heading, bulletList (`<ul>`), orderedList (`<ol>`), blockquote, codeBlock, horizontalRule; marks: bold, italic, code, strike, link (`<a>`)
- **Image insert**: File picker → `FileReader.readAsDataURL` → base64 stored in content JSON
- **Image resize + align**: `ImageView` NodeViewRenderer shows controls on **hover** (not selection) — hover in/out drives `showControls` state. Controls display BELOW the image (not as absolute overlay) to avoid `overflow: hidden` clipping. Width presets (25%/50%/75%/100%) in one pill group; alignment buttons (⇤/↔/⇥ = left/center/right) in another. `align` attribute on `ImageNode` maps to `marginLeft/marginRight: auto` style.
- **Cursor after block atoms**: After inserting `image` or `audio` nodes, always append `{ type: 'paragraph' }` so the cursor has somewhere to land after the block.
- **Voice memos**: `AudioNode` inserted via `MediaRecorder` → blob → `FileReader.readAsDataURL`. `AudioView` renders `<audio controls>`. Stop button + timer shown in primary toolbar row when recording is active.
- **Toolbar layout**: Two-row collapsible. Primary row (always): Bold, Italic, H2, H3, **CodeBlock**, **Divider**, Image, Link, Mic/Recording, **ChevronDown** | spacer | FileCode2, HelpCircle. Secondary row (expanded): List, OrderedList, Blockquote. ChevronDown is the last button on the left group (before the spacer). `toolbarExpanded` state drives visibility.
- **Code blocks (transparent overlay)**: `.tiptap pre` and `.note-rich-preview pre` use `rgba(0,0,0,0.06)` bg and `rgba(0,0,0,0.22)` left border — inherits and slightly darkens the note's own background color. Same transparent approach for inline code. Dark mode uses `rgba(255,255,255,0.07)`.
- **Card preview (NoteCard RichNode)**: Handles `image` (renders `<img>` with 80px max-height) and `audio` (renders "🎤 Voice memo" text placeholder) node types.
- **Help dropdown**: Fixed-position (`position: fixed`) using `getBoundingClientRect()` on `helpBtnRef` — prevents document scroll. Transparent backdrop overlay for click-outside dismiss.
- **Hyperlink**: `Link` extension; `handleLinkToggle` unsets if active, otherwise opens inline URL input. `handleLinkInsert` prepends `https://` if missing.
- **Paste markdown**: `markdownToTiptap(md)` converts raw markdown string → Tiptap JSON; triggered via `FileCode2` button.
- **Import**: `Node`, `mergeAttributes`, `ReactNodeViewRenderer`, `NodeViewWrapper` all from `@tiptap/react` (not `@tiptap/core` — not directly in web node_modules).

---

## Grid Layout & Note Sizing

- **CSS grid**: `note-grid` uses `grid-template-columns: repeat(auto-fill, minmax(220px, 1fr))`
- **Column span** (NoteGrid.tsx `getColSpan`): Instead of `width: Npx` inline (causes overflow), the SortableNoteCard wrapper uses `gridColumn: span N` where `N = Math.round(parsedWidth / 220)`. LARGE = span 2, all others = span 1. This keeps the grid responsive.
- **Height**: Still applied as `minHeight` inline style on the card itself.
- **Drag resize**: `dragWidth` tracks current width during resize pointer events; on pointer-up saves `WxH` format; `justResizedRef` prevents card-click from firing after a resize.

---

## Admin User Management

- **Procedures** (`apps/api/src/routers/admin/users.ts`):
  - `updateUser`: calls `auth.api.adminUpdateUser({ body: { userId, data: { name, email } }, headers })` — forwards `cookie` and `authorization` headers from `ctx.req.headers` for better-auth session validation
  - `setUserPassword`: calls `auth.api.setUserPassword({ body: { userId, newPassword }, headers })`
- **UI** (`apps/web/src/pages/admin/UsersPage.tsx`):
  - `EditUserRow` — inline component with name + email inputs, appears below user row when Pencil icon clicked
  - `SetPasswordRow` — inline component with password input, appears below user row when KeyRound icon clicked
  - `editingId` / `passwordId` state control which rows are expanded

---

## Profile Picture Upload

- **UserSettingsPage**: Avatar section has hover overlay with Upload button
- Hidden `<input type="file" accept="image/*">` linked via `useRef`
- `handleAvatarFile`: reads via `FileReader.readAsDataURL`, sets as `image` state
- When `image` starts with `data:`, hides URL input and shows "Image uploaded" hint
- Saved via `authClient.updateUser({ image: dataUrl })`

---

## Sidebar Section Scroll

- Stacks list wrapped in `max-h-[200px] overflow-y-auto` div
- Labels list wrapped in `max-h-[180px] overflow-y-auto` div
- Prevents sidebar from becoming longer than viewport when many stacks/labels exist

---

## Stacks (Note Workspaces)

- `Stack` model: `{ id, userId, name, icon?, color?, sortOrder }`
- `Note.stackId`: FK to Stack (nullable; null = inbox)
- `trpc.notes.list({ stackId })`: `undefined` = all, `null` = inbox only, `string` = specific stack
- Sidebar shows stacks above labels; `/stack/:id` route opens `StackPage`
- "Move to stack" submenu in NoteActions dropdown

---

## Sharing

- **Public link**: `Note.publicShareToken` (UUID), route `/share/:token` → `PublicNotePage`
- **User sharing**: `NoteShare` table with `VIEW | EDIT` permission
- `NoteShareDialog`: manage both in one modal (accessed via ··· menu → Share)
- Shared user avatars shown on `NoteCard` (bottom-left) when `note.sharedWith.length > 0`

---

## Multi-select

- `selectedNoteIds: string[]` in `ui.store` — transient (not persisted)
- `toggleNoteSelection(id)`, `clearNoteSelection()`, `selectAllNotes(ids)` actions
- `NoteGrid.tsx` handles keyboard: `Ctrl/Cmd+A` → select all visible notes; `Escape` → deselect (skips when focused in inputs)
- `NoteMultiSelectBar` (fixed bottom bar): Archive, Trash, **Label** actions on all selected notes
  - Label popover shows all labels with tri-state checkboxes: filled=all notes have it, dash=some notes have it, empty=none
  - Toggle: if all selected notes have label → detach from all; otherwise → attach to all (upsert handles dupes)
  - Label state computed from `qc.getQueryData([['notes', 'list']])?.notes`

---

## Selection Style

HA-inspired glow shadow (not flat ring):
```ts
// NoteCard.tsx — isSelected variant
'!border-primary/60 shadow-[0_0_0_2px_hsl(var(--primary)/0.5),0_6px_24px_-4px_hsl(var(--primary)/0.2)] z-10'
```

---

## Common Patterns

### Query Invalidation

```ts
function invalidate() {
  qc.invalidateQueries({ queryKey: [['notes']] })
  qc.invalidateQueries({ queryKey: [['search']] })
}
const mutation = trpc.notes.update.useMutation({ onSuccess: invalidate })
```

### mapNote (API)

Always call `mapNote(note)` before returning from notes router to:
- Convert Date → ISO string
- Flatten `labels: note.labels.map(nl => nl.label)`
- Include `sharedWith` array from shares relation

### Search Router (search.ts)

- Uses raw `$queryRaw` for full-text ILIKE across note fields + todoItems + taskSteps
- Must include `shares` relation in `findMany` and map to `sharedWith` array — NoteCard accesses `note.sharedWith.length` and will crash if missing
- Field name: `s.sharedWithUserId` (not `sharedWithId`)

### Admin Protected Pages

```tsx
// Check in component: redirect if not admin
// adminProcedure in API: throws FORBIDDEN automatically
```

---

## Running Locally

```bash
export PATH="$HOME/.nvm/versions/node/v22.19.0/bin:$PATH"

# Dev (from root)
pnpm dev          # runs api + web concurrently

# DB
cd apps/api
node_modules/.bin/prisma db push --accept-data-loss   # apply schema changes
node_modules/.bin/prisma studio                        # DB browser

# TypeScript check
cd apps/web && node_modules/.bin/tsc --noEmit
cd apps/api && node_modules/.bin/tsc --noEmit

# Build
cd apps/web && node_modules/.bin/vite build
```

> **pnpm version**: project uses pnpm v10 store; system may have v9.
> Cannot install new packages without matching version.
> Use imports from already-installed packages where possible.

---

## Important Files Quick Reference

| What | File |
|------|------|
| API entry + cron | `apps/api/src/index.ts` |
| tRPC root router | `apps/api/src/trpc/router.ts` |
| Notes API | `apps/api/src/routers/notes.ts` |
| Stacks API | `apps/api/src/routers/stacks.ts` |
| Sharing API | `apps/api/src/routers/sharing.ts` |
| Auth setup | `apps/api/src/auth/auth.ts` |
| Prisma schema | `apps/api/prisma/schema.prisma` |
| Shared types | `packages/shared/src/types/` |
| Shared validators | `packages/shared/src/validators/` |
| Shared index | `packages/shared/src/index.ts` |
| CSS/theme vars | `apps/web/src/styles/globals.css` |
| UI store | `apps/web/src/store/ui.store.ts` |
| App routes | `apps/web/src/App.tsx` |
| Main layout | `apps/web/src/components/layout/AppShell.tsx` |
| Note card | `apps/web/src/components/notes/NoteCard.tsx` |
| Rich editor | `apps/web/src/components/notes/NoteEditorRich.tsx` |
| Login page | `apps/web/src/pages/LoginPage.tsx` |
| Favicon | `apps/web/public/favicon.svg` |
