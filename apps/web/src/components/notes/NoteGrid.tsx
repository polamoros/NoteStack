import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core'
import { SortableContext, useSortable, rectSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useState, useEffect } from 'react'
import { generateKeyBetween } from 'fractional-indexing'
import { trpc } from '@/api/client'
import { useQueryClient } from '@tanstack/react-query'
import { NoteCard } from './NoteCard'
import type { Note } from '@notes/shared'
import { cn, getNoteColorStyle } from '@/lib/utils'
import { useUIStore } from '@/store/ui.store'

interface NoteGridProps {
  notes: Note[]
  view?: 'active' | 'archived' | 'trashed'
  showPinnedSection?: boolean
}

/** Convert note size string → CSS grid column span.
 *  "WxH" format: span = round(W / 220), min 1.
 *  "LARGE" named size: span 2. All others: span 1.
 */
function getColSpan(size: string): number {
  const wh = size.match(/^(\d+)x(\d+)$/)
  if (wh) return Math.max(1, Math.round(parseInt(wh[1], 10) / 220))
  if (size === 'LARGE') return 2
  return 1
}

function SortableNoteCard({ note, view }: { note: Note; view: 'active' | 'archived' | 'trashed' }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: note.id,
    disabled: view !== 'active',
  })

  const colSpan = getColSpan(note.size)

  return (
    <div
      ref={setNodeRef}
      className="note-card-wrapper"
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0 : 1,
        // Span multiple columns for wide notes (WxH format or LARGE)
        gridColumn: colSpan > 1 ? `span ${colSpan}` : undefined,
      }}
      {...attributes}
      {...listeners}
    >
      <NoteCard note={note} view={view} />
    </div>
  )
}

const GHOST_SIZE_CLASSES: Record<string, string> = {
  SMALL: 'min-h-[100px]',
  MEDIUM: 'min-h-[180px]',
  LARGE: 'min-h-[280px]',
  AUTO: 'min-h-[80px]',
}

/** Parse WxH or plain H size strings */
function parseSizeForGhost(size: string): { width: number | null; height: number | null } {
  const wh = size.match(/^(\d+)x(\d+)$/)
  if (wh) return { width: parseInt(wh[1]), height: parseInt(wh[2]) }
  if (/^\d+$/.test(size)) return { width: null, height: parseInt(size) }
  return { width: null, height: null }
}

/** Lightweight drag ghost shown by DragOverlay — avoids mounting full NoteCard with side effects */
function NoteCardGhost({ note }: { note: Note }) {
  const { className: colorClass, style: colorStyle } = getNoteColorStyle(note.color)

  const { width: savedW, height: savedH } = parseSizeForGhost(note.size)
  const sizeClass = savedH === null && savedW === null
    ? (GHOST_SIZE_CLASSES[note.size] ?? GHOST_SIZE_CLASSES.AUTO)
    : undefined
  const dimStyle: React.CSSProperties = {
    ...(savedH !== null ? { minHeight: `${savedH}px` } : {}),
    ...(savedW !== null ? { width: `${savedW}px` } : {}),
  }

  const previewText = (() => {
    if (note.type !== 'RICH' || !note.content) return null
    try {
      const extractText = (n: any): string =>
        n.type === 'text' ? (n.text ?? '') : (n.content ?? []).map(extractText).join('')
      return extractText(JSON.parse(note.content)).slice(0, 120)
    } catch {
      return note.content.slice(0, 120)
    }
  })()

  return (
    <div
      className={cn(
        'rounded-lg border shadow-2xl pointer-events-none',  // removed rotate-1 (A8)
        colorClass,
        sizeClass,
      )}
      style={{ ...colorStyle, ...dimStyle }}
    >
      <div className="p-3">
        {note.title && <h3 className="font-medium text-sm mb-1 leading-snug">{note.title}</h3>}
        {previewText && (
          <p className="text-sm text-muted-foreground line-clamp-4 opacity-70">{previewText}</p>
        )}
      </div>
    </div>
  )
}

export function NoteGrid({ notes, view = 'active', showPinnedSection = true }: NoteGridProps) {
  const qc = useQueryClient()
  const { viewMode, gridColumns } = useUIStore()
  const editorOpen = useUIStore((s) => s.editorOpen)
  const selectedNoteIds = useUIStore((s) => s.selectedNoteIds)
  const clearNoteSelection = useUIStore((s) => s.clearNoteSelection)
  const selectAllNotes = useUIStore((s) => s.selectAllNotes)
  const reorder = trpc.notes.reorder.useMutation()
  const [activeNote, setActiveNote] = useState<Note | null>(null)

  // Ctrl/Cmd+A → select all visible notes; Escape → deselect
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Don't intercept when user is typing in an input/textarea
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement).isContentEditable) return

      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault()
        selectAllNotes(notes.map((n) => n.id))
      }
      if (e.key === 'Escape' && selectedNoteIds.length > 0) {
        clearNoteSelection()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [notes, selectedNoteIds.length, selectAllNotes, clearNoteSelection])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  )

  const pinned = notes.filter((n) => n.isPinned)
  const unpinned = notes.filter((n) => !n.isPinned)

  function handleDragStart({ active }: DragStartEvent) {
    setActiveNote(notes.find((n) => n.id === active.id) ?? null)
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveNote(null)
    const { active, over } = event
    if (!over || active.id === over.id) return

    const allNotes = [...pinned, ...unpinned]
    const activeIndex = allNotes.findIndex((n) => n.id === active.id)
    const overIndex = allNotes.findIndex((n) => n.id === over.id)
    if (activeIndex === -1 || overIndex === -1) return

    const prevNote = overIndex > 0 ? allNotes[overIndex - (activeIndex > overIndex ? 1 : 0)] : null
    const nextNote =
      overIndex < allNotes.length - 1 ? allNotes[overIndex + (activeIndex < overIndex ? 1 : 0)] : null

    const newSortOrder = generateKeyBetween(
      prevNote?.sortOrder ?? null,
      nextNote?.sortOrder ?? null,
    )

    qc.setQueryData([['notes', 'list']], (old: any) => {
      if (!old) return old
      return {
        ...old,
        notes: old.notes.map((n: Note) =>
          n.id === active.id ? { ...n, sortOrder: newSortOrder } : n,
        ),
      }
    })

    reorder.mutate({ id: active.id as string, newSortOrder })
  }

  // When gridColumns > 0, override CSS auto-fill with a fixed column count
  const gridStyle: React.CSSProperties = viewMode === 'grid' && gridColumns > 0
    ? { gridTemplateColumns: `repeat(${gridColumns}, minmax(0, 1fr))` }
    : {}

  // Disable text selection while dragging
  const gridClass = cn(
    viewMode === 'grid' ? 'note-grid' : 'flex flex-col gap-2 max-w-2xl mx-auto',
    activeNote && 'select-none',
  )

  const renderCards = (noteList: Note[]) =>
    noteList.map((note) => <SortableNoteCard key={note.id} note={note} view={view} />)

  const inner = !showPinnedSection || pinned.length === 0 ? (
    <div className={gridClass} style={gridStyle}>{renderCards(notes)}</div>
  ) : (
    <>
      {pinned.length > 0 && (
        <section className="mb-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 px-1">
            Pinned
          </p>
          <div className={gridClass} style={gridStyle}>{renderCards(pinned)}</div>
        </section>
      )}
      {unpinned.length > 0 && (
        <section>
          {pinned.length > 0 && (
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 px-1">
              Others
            </p>
          )}
          <div className={gridClass} style={gridStyle}>{renderCards(unpinned)}</div>
        </section>
      )}
    </>
  )

  return (
    <DndContext
      sensors={editorOpen ? [] : sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={notes.map((n) => n.id)} strategy={rectSortingStrategy}>
        {inner}
      </SortableContext>
      <DragOverlay dropAnimation={null}>
        {activeNote ? <NoteCardGhost note={activeNote} /> : null}
      </DragOverlay>
    </DndContext>
  )
}
