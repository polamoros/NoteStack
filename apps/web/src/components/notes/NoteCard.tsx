import { useState, useEffect, useRef } from 'react'
import { cn, getNoteColorStyle } from '@/lib/utils'
import type { Note, NoteSharedWith } from '@notes/shared'
import { NoteActions } from './NoteActions'
import { NoteEditor } from './NoteEditor'
import { Pin, Bell, Check } from 'lucide-react'
import { formatReminderDate } from '@/lib/utils'
import { trpc } from '@/api/client'
import { useQueryClient } from '@tanstack/react-query'
import { useUIStore } from '@/store/ui.store'
import { LabelIcon } from '@/components/labels/LabelIcon'

// Named sizes: max-height enforces clipping so cards don't expand past the chosen size.
// AUTO has no max-height — it grows to fit all content.
const NAMED_SIZE_CLASSES: Record<string, string> = {
  SMALL: 'min-h-[100px] max-h-[130px] overflow-hidden',
  MEDIUM: 'min-h-[180px] max-h-[210px] overflow-hidden',
  LARGE: 'min-h-[280px] max-h-[320px] overflow-hidden',
  AUTO: 'min-h-[80px]',
}
const MIN_HEIGHT = 100  // absolute minimum drag height in px (matches SMALL)
const MIN_WIDTH  = 180  // absolute minimum drag width in px

/**
 * Parses the stored size string into pixel dimensions.
 *   "320x200" → { width: 320, height: 200 }   (bidirectional resize)
 *   "320"     → { width: null, height: 320 }   (legacy height-only)
 *   other     → { width: null, height: null }   (named size: SMALL/MEDIUM/LARGE/AUTO)
 */
function parseSize(size: string): { width: number | null; height: number | null } {
  const wh = size.match(/^(\d+)x(\d+)$/)
  if (wh) return { width: parseInt(wh[1], 10), height: parseInt(wh[2], 10) }
  if (/^\d+$/.test(size)) return { width: null, height: parseInt(size, 10) }
  return { width: null, height: null }
}

interface NoteCardProps {
  note: Note
  view?: 'active' | 'archived' | 'trashed'
}

export function NoteCard({ note, view = 'active' }: NoteCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [editorOpen, setEditorOpen] = useState(false)
  const [hovered, setHovered] = useState(false)
  const [dragHeight, setDragHeight] = useState<number | null>(null)
  const [dragWidth, setDragWidth] = useState<number | null>(null)
  const [isResizing, setIsResizing] = useState(false)
  // Prevents the card click from firing immediately after a resize gesture ends
  const justResizedRef = useRef(false)

  const setGlobalEditorOpen = useUIStore((s) => s.setEditorOpen)
  const selectedNoteIds   = useUIStore((s) => s.selectedNoteIds)
  const toggleNoteSelection = useUIStore((s) => s.toggleNoteSelection)
  const qc = useQueryClient()

  const isSelected   = selectedNoteIds.includes(note.id)
  const isSelectMode = selectedNoteIds.length > 0

  const updateNote = trpc.notes.update.useMutation({
    onSuccess: () => qc.invalidateQueries({ queryKey: [['notes']] }),
  })
  const toggleTodo = trpc.todoItems.update.useMutation({
    onSuccess: () => qc.invalidateQueries({ queryKey: [['notes']] }),
  })
  const toggleTask = trpc.taskSteps.update.useMutation({
    onSuccess: () => qc.invalidateQueries({ queryKey: [['notes']] }),
  })

  useEffect(() => {
    setGlobalEditorOpen(editorOpen)
    return () => { if (editorOpen) setGlobalEditorOpen(false) }
  }, [editorOpen, setGlobalEditorOpen])

  // Resolve effective dimensions:
  //   dragHeight/dragWidth → live values during resize
  //   savedHeight/savedWidth → previously persisted pixel values
  //   null → fall back to named CSS size class
  const { width: savedWidth, height: savedHeight } = parseSize(note.size)
  const effectiveHeight = dragHeight ?? savedHeight
  const effectiveWidth  = dragWidth  ?? savedWidth

  const nextReminder = note.reminders.find((r) => r.nextOccurrence && !r.isAcknowledged)

  const isEmpty =
    !note.title &&
    !note.content &&
    note.todoItems.length === 0 &&
    note.taskSteps.length === 0

  const { className: colorClass, style: colorStyle } = getNoteColorStyle(note.color)

  // Completion ratio for the progress strip at the bottom of the card
  const completionRatio = (() => {
    if (note.type === 'TODO' && note.todoItems.length > 0)
      return note.todoItems.filter((i) => i.isChecked).length / note.todoItems.length
    if (note.type === 'TASK' && note.taskSteps.length > 0)
      return note.taskSteps.filter((s) => s.isComplete).length / note.taskSteps.length
    return null
  })()

  // ─── Bidirectional drag-to-resize ─────────────────────────────────────────
  function handleResizePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    e.stopPropagation()
    e.preventDefault()

    const card = cardRef.current
    if (!card) return

    const startY = e.clientY
    const startX = e.clientX
    const rect   = card.getBoundingClientRect()
    const startH = rect.height
    const startW = rect.width
    let liveH = startH
    let liveW = startW

    setIsResizing(true)

    function onMove(ev: PointerEvent) {
      liveH = Math.max(MIN_HEIGHT, startH + ev.clientY - startY)
      liveW = Math.max(MIN_WIDTH,  startW + ev.clientX - startX)
      setDragHeight(liveH)
      setDragWidth(liveW)
    }

    function onUp() {
      document.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerup',   onUp)
      document.removeEventListener('pointercancel', onUp)
      setDragHeight(null)
      setDragWidth(null)
      setIsResizing(false)
      // Prevent the pointer-up from triggering a card open
      justResizedRef.current = true
      setTimeout(() => { justResizedRef.current = false }, 150)
      // Persist as "WxH" format
      updateNote.mutate({ id: note.id, size: `${Math.round(liveW)}x${Math.round(liveH)}` })
    }

    document.addEventListener('pointermove', onMove)
    document.addEventListener('pointerup',   onUp)
    document.addEventListener('pointercancel', onUp)
  }

  function handleCardClick() {
    if (view === 'trashed' || isResizing || justResizedRef.current) return
    if (isSelectMode) {
      toggleNoteSelection(note.id)
      return
    }
    setEditorOpen(true)
  }

  return (
    <>
      <div
        ref={cardRef}
        className={cn(
          'relative rounded-lg border cursor-pointer group',
          !isResizing && 'transition-shadow duration-150',
          'hover:shadow-md',
          colorClass,
          // Apply named size class only when no pixel dimensions are set
          effectiveHeight === null && effectiveWidth === null
            && (NAMED_SIZE_CLASSES[note.size] ?? NAMED_SIZE_CLASSES.AUTO),
          isSelected   && 'ring-2 ring-primary ring-offset-1',
          isResizing   && 'select-none z-50',
        )}
        style={{
          ...colorStyle,
          ...(effectiveHeight !== null ? { minHeight: `${effectiveHeight}px` } : {}),
          // Setting explicit width lets the card overflow its grid column (free-form resize)
          ...(effectiveWidth  !== null ? { width: `${effectiveWidth}px` } : {}),
        }}
        onClick={handleCardClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => { if (!isResizing) setHovered(false) }}
      >
        {/* ── Top-right: selection checkbox (select mode) OR pin indicator ── */}
        {isSelectMode ? (
          <div
            className={cn(
              'absolute top-2 right-2 z-10',
              'h-5 w-5 rounded flex items-center justify-center',
              isSelected
                ? 'bg-primary text-primary-foreground'
                : 'bg-background/80 border border-border hover:border-primary',
            )}
            onClick={(e) => { e.stopPropagation(); toggleNoteSelection(note.id) }}
            onPointerDown={(e) => e.stopPropagation()}
            title={isSelected ? 'Deselect' : 'Select'}
          >
            {isSelected && <Check className="h-3 w-3" />}
          </div>
        ) : (
          note.isPinned && (
            <div className="absolute top-2 right-2">
              <Pin className="h-3.5 w-3.5 text-muted-foreground rotate-45" />
            </div>
          )
        )}

        {/* ── Note content ─────────────────────────────────────────────────── */}
        <div className="p-3 pb-10">
          {note.title && (
            <h3 className="font-medium text-sm mb-1 pr-6 leading-snug">{note.title}</h3>
          )}

          {note.type === 'RICH' && note.content && (
            <NoteRichPreview content={note.content} />
          )}
          {note.type === 'TODO' && note.todoItems.length > 0 && (
            <NoteTodoPreview
              items={note.todoItems}
              onToggle={(id, isChecked) => toggleTodo.mutate({ id, isChecked })}
            />
          )}
          {note.type === 'TASK' && note.taskSteps.length > 0 && (
            <NoteTaskPreview
              steps={note.taskSteps}
              onToggle={(id, isComplete) => toggleTask.mutate({ id, isComplete })}
            />
          )}

          {isEmpty && (
            <p className="text-sm text-muted-foreground/50 italic select-none">Empty note</p>
          )}

          {note.labels.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {note.labels.map((label) => (
                <span
                  key={label.id}
                  className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full"
                  style={
                    label.color
                      ? { background: label.color + '33', color: label.color, border: `1px solid ${label.color}55` }
                      : undefined
                  }
                  title={label.name}
                >
                  {(label.icon || label.color) && (
                    <LabelIcon icon={label.icon} color={label.color} size={11} />
                  )}
                  <span className={cn(!label.color && 'text-foreground/70')}>{label.name}</span>
                </span>
              ))}
            </div>
          )}

          {nextReminder && (
            <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
              <Bell className="h-3 w-3" />
              <span>{formatReminderDate(nextReminder.nextOccurrence!)}</span>
            </div>
          )}
        </div>

        {/* ── Completion progress strip — absolute at the very bottom edge ── */}
        {completionRatio !== null && (
          <div className="absolute bottom-0 left-0 right-0 h-1.5 rounded-b-lg overflow-hidden bg-black/[0.06] dark:bg-white/[0.08]">
            <div
              className={cn(
                'h-full rounded-bl-lg transition-all duration-300',
                note.type === 'TODO' ? 'bg-green-500/70' : 'bg-blue-500/70',
              )}
              style={{ width: `${completionRatio * 100}%` }}
            />
          </div>
        )}

        {/* ── Action toolbar (visible on hover, hidden in select/resize) ──── */}
        <div
          className={cn(
            'absolute bottom-0 left-0 right-0 rounded-b-lg pt-8 pb-1.5 px-1.5',
            'bg-gradient-to-t from-black/30 dark:from-black/60 via-black/10 dark:via-black/25 to-transparent',
            'transition-opacity duration-100',
            hovered && !isSelectMode && !isResizing ? 'opacity-100' : 'opacity-0',
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between">
            {/* Shared-with avatars — left side */}
            {note.sharedWith.length > 0 ? (
              <div className="flex items-center pl-1.5">
                <SharedAvatars users={note.sharedWith} />
              </div>
            ) : (
              <div />
            )}
            {/* Action buttons — right side */}
            <div className="flex items-center pr-4">
              <NoteActions note={note} view={view} onEdit={() => setEditorOpen(true)} compact />
            </div>
          </div>
        </div>

        {/* ── Resize handle (bottom-right corner) ──────────────────────────── */}
        {view !== 'trashed' && !isSelectMode && (
          <div
            className={cn(
              'absolute bottom-0.5 right-0.5 w-3.5 h-3.5',
              'flex items-end justify-end pb-px pr-px',
              'cursor-se-resize transition-opacity duration-100',
              hovered || isResizing ? 'opacity-50 hover:opacity-90' : 'opacity-0',
            )}
            onPointerDown={handleResizePointerDown}
            title="Drag to resize"
          >
            {/* Classic 3-dot diagonal resize indicator */}
            <svg
              width="7"
              height="7"
              viewBox="0 0 8 8"
              fill="currentColor"
              className="text-foreground"
            >
              <circle cx="7" cy="7" r="1.1" />
              <circle cx="4" cy="7" r="1.1" />
              <circle cx="7" cy="4" r="1.1" />
            </svg>
          </div>
        )}

        {/* Size tooltip during active resize */}
        {isResizing && (dragHeight !== null || dragWidth !== null) && (
          <div className="absolute bottom-7 right-2 text-[9px] font-mono text-foreground/60 select-none pointer-events-none bg-background/70 px-1 rounded">
            {dragWidth !== null ? `${Math.round(dragWidth)}` : ''}
            {dragWidth !== null && dragHeight !== null ? '×' : ''}
            {dragHeight !== null ? `${Math.round(dragHeight)}` : ''}px
          </div>
        )}
      </div>

      {editorOpen && (
        <NoteEditor note={note} onClose={() => setEditorOpen(false)} />
      )}
    </>
  )
}

// ── Rich content preview — renders Tiptap JSON as formatted HTML ──────────────
function NoteRichPreview({ content }: { content: string }) {
  try {
    const doc = JSON.parse(content)
    const nodes = (doc.content ?? []) as any[]
    if (!nodes.length) return null
    return (
      <div className="note-rich-preview text-sm text-muted-foreground line-clamp-[8]">
        {nodes.map((node: any, i: number) => (
          <RichNode key={i} node={node} />
        ))}
      </div>
    )
  } catch {
    return <p className="text-sm text-muted-foreground">{content.slice(0, 200)}</p>
  }
}

function RichInline({ node }: { node: any }): React.ReactElement | null {
  if (node.type === 'hardBreak') return <br />
  if (node.type !== 'text') return null
  const text: string = node.text ?? ''
  const marks: any[] = node.marks ?? []
  let el: React.ReactElement = <>{text}</>
  for (const mark of marks) {
    if (mark.type === 'bold')   el = <strong>{el}</strong>
    if (mark.type === 'italic') el = <em>{el}</em>
    if (mark.type === 'code')   el = <code>{el}</code>
    if (mark.type === 'strike') el = <s>{el}</s>
  }
  return el
}

function RichNode({ node }: { node: any }): React.ReactElement | null {
  const inlines = (node.content ?? []) as any[]
  const children = inlines.map((c: any, i: number) => <RichInline key={i} node={c} />)

  switch (node.type) {
    case 'paragraph':
      return <p>{children.length ? children : null}</p>
    case 'heading':
      return <p className="font-semibold">{children}</p>
    case 'codeBlock':
      return <pre><code>{inlines.map((c: any) => c.text ?? '').join('')}</code></pre>
    case 'blockquote':
      return (
        <p className="border-l-2 border-muted-foreground/30 pl-2 italic opacity-75">
          {(node.content ?? []).map((c: any, i: number) => <RichNode key={i} node={c} />)}
        </p>
      )
    case 'bulletList':
    case 'orderedList':
      return (
        <ul>
          {(node.content ?? []).map((item: any, i: number) => (
            <li key={i}>
              {(item.content ?? []).map((c: any, j: number) => <RichNode key={j} node={c} />)}
            </li>
          ))}
        </ul>
      )
    case 'taskList':
      return (
        <ul>
          {(node.content ?? []).map((item: any, i: number) => (
            <li key={i} className="flex items-start gap-1">
              <span className="shrink-0 mt-0.5 opacity-60">{item.attrs?.checked ? '☑' : '☐'}</span>
              <span>{(item.content ?? []).map((c: any, j: number) => <RichNode key={j} node={c} />)}</span>
            </li>
          ))}
        </ul>
      )
    case 'horizontalRule':
      return <hr />
    default:
      return null
  }
}

// ── Shared-with avatar stack ───────────────────────────────────────────────────
function SharedAvatars({ users }: { users: NoteSharedWith[] }) {
  const MAX_VISIBLE = 3
  const visible = users.slice(0, MAX_VISIBLE)
  const overflow = users.length - MAX_VISIBLE

  return (
    <div className="flex items-center" style={{ gap: '-4px' }}>
      {visible.map((u, i) => (
        <div
          key={u.userId}
          className="relative h-5 w-5 rounded-full border border-background/80 overflow-hidden bg-muted"
          style={{ zIndex: MAX_VISIBLE - i, marginLeft: i > 0 ? '-4px' : 0 }}
          title={u.name ?? u.userId}
        >
          {u.image ? (
            <img src={u.image} alt={u.name ?? ''} className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full flex items-center justify-center text-[8px] font-medium text-foreground/70">
              {(u.name ?? '?').slice(0, 1).toUpperCase()}
            </div>
          )}
        </div>
      ))}
      {overflow > 0 && (
        <div
          className="relative h-5 w-5 rounded-full border border-background/80 bg-muted flex items-center justify-center text-[8px] font-medium text-foreground/70"
          style={{ marginLeft: '-4px', zIndex: 0 }}
          title={`${overflow} more`}
        >
          +{overflow}
        </div>
      )}
    </div>
  )
}

function NoteTodoPreview({
  items,
  onToggle,
}: {
  items: Note['todoItems']
  onToggle: (id: string, isChecked: boolean) => void
}) {
  const visible   = items.slice(0, 5)
  const remaining = items.length - visible.length
  return (
    <div className="space-y-0.5">
      {visible.map((item) => (
        <div key={item.id} className="flex items-start gap-2 text-sm">
          <button
            className={cn(
              'mt-0.5 h-4 w-4 shrink-0 rounded-sm border border-current flex items-center justify-center transition-opacity',
              item.isChecked && 'opacity-50',
            )}
            onClick={(e) => { e.stopPropagation(); onToggle(item.id, !item.isChecked) }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            {item.isChecked && <span className="text-xs">✓</span>}
          </button>
          <span className={cn(item.isChecked && 'line-through opacity-50')}>{item.text}</span>
        </div>
      ))}
      {remaining > 0 && (
        <p className="text-xs text-muted-foreground pl-6">+{remaining} more items</p>
      )}
    </div>
  )
}

function NoteTaskPreview({
  steps,
  onToggle,
}: {
  steps: Note['taskSteps']
  onToggle: (id: string, isComplete: boolean) => void
}) {
  const visible   = steps.slice(0, 4)
  const remaining = steps.length - visible.length
  return (
    <div className="space-y-0.5">
      {visible.map((step) => (
        <div key={step.id} className="flex items-start gap-2 text-sm">
          <button
            className={cn(
              'mt-0.5 h-4 w-4 shrink-0 rounded-full border border-current flex items-center justify-center transition-opacity',
              step.isComplete && 'opacity-50',
            )}
            onClick={(e) => { e.stopPropagation(); onToggle(step.id, !step.isComplete) }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            {step.isComplete && <span className="text-xs">✓</span>}
          </button>
          <span className={cn(step.isComplete && 'line-through opacity-50')}>{step.title}</span>
        </div>
      ))}
      {remaining > 0 && (
        <p className="text-xs text-muted-foreground pl-6">+{remaining} more steps</p>
      )}
    </div>
  )
}
