# Changelog

All notable changes to NoteStack are documented here.

---

## [Unreleased]

### Added
- **Vivid color picker swatches** — the color picker now shows saturated, recognisable swatch buttons (Tailwind -400 level hues) instead of the same washed-out pastel used for the card background. A `NOTE_SWATCH_COLORS` map in `utils.ts` drives the picker; card background colours are unchanged.

### Changed
- **Note card polish** — cards are now `rounded-2xl` (was `rounded-lg`), carry a subtle `shadow-sm` at rest, lift with `shadow-md + -translate-y-px` on hover, and use a lighter semi-transparent border (`border-black/[0.06]` light / `border-white/[0.08]` dark) instead of the hard `border-border` value. Note grid gap increased from `0.5 rem` to `0.75 rem`.
- **Note background colours** — light-mode tints reduced to ~45–65 % saturation (was 77–98 %) for a softer, less candy-like look while keeping the hues clearly distinct. Dark-mode equivalents adjusted to match the same restrained palette.

### Fixed
- **Markdown shortcuts dropdown** — the help popover now renders via `createPortal` into `document.body`, escaping the Radix Dialog's `transform: translate(-50%, -50%)` containing block that previously made `position: fixed` elements appear off-screen.
- **TopBar search alignment** — the search bar is now absolutely centred in the header regardless of the asymmetric widths of the left (sidebar toggle) and right (view/theme controls) groups. Previously `flex-1 max-w-xl` left the search flush-left with a gap before the controls. Fixed by positioning it with `absolute inset-x-0` and `pointer-events-none` on the wrapper (with `pointer-events-auto` restored on the input) so it doesn't block clicks on the overlapping edge buttons.
- **Section drag & drop** — section headers now preserve their position after a drag operation. Root cause: the optimistic cache update was only mutating `sortOrder` on the moved item without re-sorting the array, so after drop the item snapped back. Fix: re-sort the full notes array by `sortOrder` inside `setQueriesData` so the visual order is immediately correct.
- **Section drag ghost** — the drag overlay now renders a compact pill badge for section items instead of trying to replicate the full-width separator (which collapsed to zero width inside the fixed-position DragOverlay because `flex-1` had no parent width to fill).
- **Section drag cursor** — removed duplicate `cursor-grab` / `active:cursor-grabbing` from the inner `SectionCard` element; cursor is now applied once on the outer sortable wrapper so it doesn't interfere with hover states on the edit / delete buttons.
- **Drag reorder invalidation** — added `onSuccess: () => qc.invalidateQueries(...)` to the `reorder` mutation so the server state is always reconciled after a successful drop.

---

## [WIP — 2026-03-07] Stack icon picker & login fixes

### Added
- **Stack icon picker** — the "New stack" and rename forms now include an inline icon picker. A small icon button on the left opens a compact 8-column grid of 35 common Lucide icons. Selecting one closes the picker and shows it in the button.
- **Auto-suggest stack icon** — when creating a new stack, the icon is auto-suggested as you type the name based on keyword matching (e.g. "work" → Briefcase, "travel" → Plane, "code" → Code). Manual selection locks the icon and stops auto-suggesting.

### Fixed
- **Login form jumping** — switching from Sign in to Sign up no longer makes the form jump upward. Changed vertical alignment from `items-center` to `items-start` with top padding so the form anchors from the top.
- **Stale loading state on mode switch** — if a sign-in attempt is in-flight and the user switches to the Sign up tab, the button no longer shows "Signing up…" (or vice versa). Both tab buttons now reset `loading` to `false` on click.
- **Optimistic drag update not matching cache** — `qc.setQueryData([['notes', 'list']])` uses exact key matching and never hit any real tRPC query (which includes input params in the key). Replaced with `qc.setQueriesData({ queryKey: [['notes', 'list']] })` for prefix matching.

### Changed
- **New stack input style** — replaced the boxed bordered input with a minimal underline-only input that fits the sidebar's aesthetic. The form row is now `[icon] [name…] [✓] [✗]`.
- **Admin nav item** — only rendered for users with `role === 'admin'`; regular users no longer see the Admin link in the sidebar.

---

## [WIP — 2026-03-06b] Rich editor toolbar & section drag foundations

### Added
- **Secondary toolbar row** — a collapsible second row in the rich note editor (toggle with ChevronDown) exposes: Bullet list, Ordered list, Blockquote, and Strikethrough.
- **Strikethrough support** — added to Tiptap StarterKit and the secondary toolbar.
- **Blockquote formatting** — accessible via the secondary toolbar row.

### Fixed
- **List and blockquote CSS** — Tailwind's base layer was resetting `list-style: none` on `ul`/`ol`, hiding bullets and numbers inside the editor. Added explicit `.tiptap` overrides for disc lists, decimal lists, `li`, `blockquote`, and `s`.
- **Markdown shortcuts dropdown** — the help dropdown was being clipped by the dialog's `overflow: hidden`. Fixed by switching to `position: fixed` with `getBoundingClientRect()` coordinates so it always renders above the viewport scroll.
- **Link insert with no selection** — `handleLinkInsert` now inserts the URL as a clickable hyperlink text node when no text is selected, instead of silently doing nothing.
- **Image controls hidden by overflow** — moved the image resize/alignment controls to render *below* the image instead of as an absolute overlay, preventing them from being clipped by the editor container.
- **Image controls disappearing** — added a 150 ms hide-delay (via `hideTimerRef`) so moving the mouse from the image to the controls panel doesn't cause the panel to vanish before the user reaches it.
- **Section drag** — spread dnd-kit `{...listeners}` on the outer `SortableNoteCard` wrapper for all item types (sections and notes), so pointer-down anywhere on a section row initiates a drag.

---

## [WIP — 2026-03-06a] Admin users, multi-select labels, note resizing

### Added
- **Admin user management** — admin users can now edit name / email and set a new password for any user directly from the Admin → Users page, via inline expand rows (pencil icon → `EditUserRow`, key icon → `SetPasswordRow`).
- **Multi-select label toggle** — selecting multiple notes and opening the Labels popover in the multi-select bar shows tri-state checkboxes. Toggling attaches the label to all notes that don't have it, or detaches it from all if every selected note already has it.
- **Note resize (drag)** — note cards can be resized by dragging their bottom-right corner handle. Width and height are saved as `WxH` format (e.g. `320x200`). The grid uses `gridColumn: span N` (where N = round(width/220)) to keep cards inside the CSS grid without overflow.
- **Grid column picker** — the top bar includes a slider/control to set a fixed column count (1–6) or let the grid auto-fill. Persisted to `localStorage` via Zustand.
- **Profile picture upload** — the User Settings page includes an avatar upload section: hover the avatar to reveal an Upload button, pick an image file (base64 encoded), and save via `authClient.updateUser`.
- **Section notes** — a new `SECTION` note type (`type: 'SECTION'`) renders as a full-width horizontal rule with a label. Sections can be created from the toolbar, renamed by clicking their title, and deleted.

### Fixed
- **Search router missing `sharedWith`** — the search `$queryRaw` was not including the `shares` relation, causing `note.sharedWith.length` to crash in `NoteCard`. Added `shares` include and correct `sharedWithUserId` field mapping.
- **Admin update user** — the `updateUser` and `setUserPassword` API calls now correctly forward `cookie` / `authorization` headers from `ctx.req` so better-auth can validate the admin session.

---

## [WIP — 2026-03-05] Stacks, sharing, app settings, initial feature set

### Added
- **Stacks** — exclusive note workspaces. Each stack is a named container (`Stack` model with `name`, `icon?`, `color?`, `sortOrder`). Notes have a nullable `stackId` FK; null = Default (inbox). The sidebar lists stacks above labels with inline rename and delete. `/stack/:id` opens `StackPage`.
- **Note sharing** — `NoteShare` table with `VIEW | EDIT` permissions. `NoteShareDialog` manages both public link sharing (`publicShareToken`) and per-user sharing. Shared-user avatars appear on `NoteCard`. Public notes are viewable at `/share/:token` without authentication.
- **App settings** — admin can configure `instanceName`, `logoUrl`, and `registrationOpen` flag from Admin → App Settings. The login page reads `instanceName` and `logoUrl` to white-label the instance.
- **OIDC / SSO providers** — `OidcProvider` table; admin can configure providers in Admin → Auth Config. Enabled providers appear as buttons on the login page.
- **Recurring reminders** — RFC 5545 RRULE stored per reminder, with `nextOccurrence` cached for efficient querying. Server cron fires due reminders every minute via SSE; client shows a toast notification.
- **Note drag & drop reorder** — `dnd-kit` with `rectSortingStrategy` and `closestCenter`. `fractional-indexing` sort keys for O(1) reorder without re-numbering. `DragOverlay` shows a lightweight ghost card.
- **Rich text editor** — Tiptap 2 with StarterKit (headings 1–3, code blocks, HR, lists), Placeholder, Link extension, custom `ImageNode` (with resize + align controls), custom `AudioNode` (voice memos via MediaRecorder). Toolbar: Bold, Italic, H2, H3, CodeBlock, Divider, Image, Link, Mic/Recording, More (▾) | FileCode2 (paste markdown), Help (?).
- **Markdown paste** — `FileCode2` button converts raw pasted Markdown to Tiptap JSON via `markdownToTiptap()`.
- **Note multi-select** — `Ctrl/Cmd+A` selects all visible notes; `Escape` deselects. A bottom bar appears with Archive, Trash, and Label actions for all selected notes.
- **Admin panel** — `/admin` routes (users, auth config, app settings, system info) guarded by `adminProcedure`; only visible in the sidebar for admin users.
- **User Settings page** — change name, email, password, profile picture, and preferred theme.
- **Label manager** — full CRUD for labels with name, colour (palette + custom hex picker), and icon (searchable Lucide icon grid). Labels filter the note list via `/label/:id`.
- **Theming** — light / dark / system preference, persisted in Zustand. CSS variables for both modes; note colours have separate light/dark palettes.
- **Sidebar scroll** — stacks and labels lists are independently scrollable (`max-h` + `overflow-y-auto`) so the sidebar never overflows the viewport.
- **CLAUDE.md** — developer context document describing the full stack, architecture patterns, data model, and common patterns for Claude Code.

### Changed
- **Auth** — uses `better-auth 1.x` email/password. Raw `fetch` is used for sign-in/sign-up (instead of `authClient.signIn.email()`) because the auth client's internal session refresh hangs. The first registered user is automatically promoted to `admin`.
- **Prisma** — uses `db push --accept-data-loss` (not `migrate dev`) to avoid interactive prompts.
