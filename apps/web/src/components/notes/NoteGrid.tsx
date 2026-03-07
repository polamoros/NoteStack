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
import { useState, useEffect, useRef } from 'react'
import { generateKeyBetween, generateNKeysBetween } from 'fractional-indexing'
import { trpc } from '@/api/client'
import { useQueryClient } from '@tanstack/react-query'
import { NoteCard } from './NoteCard'
import type { Note } from '@notes/shared'
import { cn, getNoteColorStyle } from '@/lib/utils'
import { useUIStore } from '@/store/ui.store'
import { Pencil, Trash2, X, Check, GripVertical } from 'lucide-react'

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

// ── Section separator card ─────────────────────────────────────────────────────
function SectionCard({
  note, view, dragHandleRef, dragListeners,
}: {
  note: Note; view: string
  dragHandleRef?: (el: HTMLElement | null) => void
  dragListeners?: Record<string, unknown>
}) {
  const qc = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(note.title || 'Section')
  const inputRef = useRef<HTMLInputElement>(null)

  const updateNote = trpc.notes.update.useMutation({
    onSuccess: () => qc.invalidateQueries({ queryKey: [['notes']] }),
  })
  const trashNote = trpc.notes.trash.useMutation({
    onSuccess: () => qc.invalidateQueries({ queryKey: [['notes']] }),
  })

  function startEdit() {
    setTitle(note.title || 'Section')
    setEditing(true)
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  function save() {
    const t = title.trim() || 'Section'
    setTitle(t)
    setEditing(false)
    if (t !== note.title) updateNote.mutate({ id: note.id, title: t })
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter') save()
    if (e.key === 'Escape') { setEditing(false); setTitle(note.title || 'Section') }
  }

  return (
    <div className="group flex items-center gap-2 py-3 px-1">
      {/* Drag handle — only this element triggers drag for sections */}
      {view === 'active' && (
        <div
          ref={dragHandleRef}
          {...dragListeners}
          className="p-0.5 text-muted-foreground opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity cursor-grab active:cursor-grabbing touch-none"
          title="Drag to reorder section and its notes"
        >
          <GripVertical className="h-4 w-4" />
        </div>
      )}
      <div className="flex-1 h-px bg-border" />

      {editing ? (
        <div className="flex items-center gap-1">
          <input
            ref={inputRef}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={save}
            onKeyDown={handleKey}
            className="text-xs font-semibold uppercase tracking-wider text-muted-foreground bg-transparent outline-none border-b border-primary min-w-[80px] max-w-[240px] text-center"
          />
          <button onClick={save} className="p-0.5 rounded hover:bg-accent text-muted-foreground">
            <Check className="h-3 w-3" />
          </button>
          <button onClick={() => { setEditing(false); setTitle(note.title || 'Section') }} className="p-0.5 rounded hover:bg-accent text-muted-foreground">
            <X className="h-3 w-3" />
          </button>
        </div>
      ) : (
        <button
          onClick={startEdit}
          className="text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 px-1"
          title="Click to rename section"
        >
          {note.title || 'Section'}
          <Pencil className="h-2.5 w-2.5 opacity-0 group-hover:opacity-60 transition-opacity" />
        </button>
      )}

      <div className="flex-1 h-px bg-border" />

      {/* Delete button — visible on hover, only in active view */}
      {view === 'active' && !editing && (
        <button
          onClick={() => trashNote.mutate({ id: note.id })}
          className="opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity p-0.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
          title="Remove section"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      )}
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

function SortableNoteCard({ note, view }: { note: Note; view: 'active' | 'archived' | 'trashed' }) {
  const {
    attributes, listeners, setNodeRef, setActivatorNodeRef,
    transform, transition, isDragging,
  } = useSortable({
    id: note.id,
    disabled: view !== 'active',
  })

  const isSection = note.type === 'SECTION'
  const colSpan = isSection ? undefined : getColSpan(note.size)
  const gridColumnStyle = isSection ? '1 / -1' : colSpan && colSpan > 1 ? `span ${colSpan}` : undefined

  if (isDragging) {
    // Show a dashed placeholder at the drop-target position (Google Keep style)
    const { width: savedW, height: savedH } = isSection ? { width: null, height: null } : parseSizeForGhost(note.size)
    const sizeClass = !isSection && savedH === null && savedW === null
      ? (GHOST_SIZE_CLASSES[note.size] ?? GHOST_SIZE_CLASSES.AUTO)
      : undefined
    const dimStyle: React.CSSProperties = {
      ...(savedH !== null ? { minHeight: `${savedH}px` } : {}),
      ...(savedW !== null ? { width: `${savedW}px` } : {}),
    }
    return (
      <div
        ref={setNodeRef}
        style={{ transform: CSS.Transform.toString(transform), transition, gridColumn: gridColumnStyle }}
        {...attributes}
      >
        <div
          className={cn(
            'rounded-lg border-2 border-dashed border-primary/30 bg-primary/5 transition-colors',
            isSection ? 'h-12' : sizeClass,
          )}
          style={dimStyle}
        />
      </div>
    )
  }

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'note-card-wrapper',
        view === 'active' && !isSection && 'cursor-grab active:cursor-grabbing',
      )}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        gridColumn: gridColumnStyle,
      }}
      {...attributes}
      // Notes: full-card drag. Sections: handle-only (listeners passed to grip).
      {...(!isSection ? listeners : {})}
    >
      {isSection
        ? <SectionCard note={note} view={view} dragHandleRef={setActivatorNodeRef} dragListeners={listeners} />
        : <NoteCard note={note} view={view} />
      }
    </div>
  )
}

/** Lightweight drag ghost shown by DragOverlay — avoids mounting full NoteCard with side effects */
function NoteCardGhost({ note, memberCount }: { note: Note; memberCount?: number }) {
  // Section separator ghost
  if (note.type === 'SECTION') {
    return (
      <div className="flex items-center justify-center gap-2 py-2 px-3 opacity-90 min-w-[200px] rounded-lg border border-dashed border-border bg-background/80 shadow-md backdrop-blur-sm">
        <div className="flex-1 h-px bg-border/70" />
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
          {note.title || 'Section'}
          {memberCount != null && memberCount > 0 && (
            <span className="ml-1.5 opacity-60 normal-case font-normal tracking-normal">
              +{memberCount} {memberCount === 1 ? 'note' : 'notes'}
            </span>
          )}
        </span>
        <div className="flex-1 h-px bg-border/70" />
      </div>
    )
  }

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
        'rounded-lg border shadow-2xl pointer-events-none',
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

// ── Section group helpers ──────────────────────────────────────────────────────

type SectionGroup = { section: Note; members: Note[] }

/** Split a sorted note list into prefix notes (before any section) + section groups. */
function buildSectionGroups(sortedNotes: Note[]): { prefix: Note[]; groups: SectionGroup[] } {
  const prefix: Note[] = []
  const groups: SectionGroup[] = []
  let current: SectionGroup | null = null

  for (const note of sortedNotes) {
    if (note.type === 'SECTION') {
      current = { section: note, members: [] }
      groups.push(current)
    } else if (current) {
      current.members.push(note)
    } else {
      prefix.push(note)
    }
  }
  return { prefix, groups }
}

export function NoteGrid({ notes, view = 'active', showPinnedSection = true }: NoteGridProps) {
  const qc = useQueryClient()
  const { viewMode, gridColumns } = useUIStore()
  const editorOpen = useUIStore((s) => s.editorOpen)
  const selectedNoteIds = useUIStore((s) => s.selectedNoteIds)
  const clearNoteSelection = useUIStore((s) => s.clearNoteSelection)
  const selectAllNotes = useUIStore((s) => s.selectAllNotes)

  const reorder = trpc.notes.reorder.useMutation({
    onSuccess: () => qc.invalidateQueries({ queryKey: [['notes']] }),
  })
  const reorderGroup = trpc.notes.reorderGroup.useMutation({
    onSuccess: () => qc.invalidateQueries({ queryKey: [['notes']] }),
  })

  const [activeNote, setActiveNote] = useState<Note | null>(null)
  const [activeSectionMemberCount, setActiveSectionMemberCount] = useState(0)

  // Ctrl/Cmd+A → select all visible notes; Escape → deselect
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
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

  // Sections are never pinned — keep them in the unpinned list regardless
  const pinned = notes.filter((n) => n.isPinned && n.type !== 'SECTION')
  const unpinned = notes.filter((n) => !n.isPinned || n.type === 'SECTION')

  function handleDragStart({ active }: DragStartEvent) {
    const n = notes.find((note) => note.id === active.id) ?? null
    setActiveNote(n)
    if (n?.type === 'SECTION') {
      const sorted = [...notes].sort((a, b) =>
        a.sortOrder < b.sortOrder ? -1 : a.sortOrder > b.sortOrder ? 1 : 0,
      )
      const { groups } = buildSectionGroups(sorted)
      const group = groups.find((g) => g.section.id === n.id)
      setActiveSectionMemberCount(group?.members.length ?? 0)
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveNote(null)
    setActiveSectionMemberCount(0)
    const { active, over } = event
    if (!over || active.id === over.id) return

    const sorted = [...notes].sort((a, b) =>
      a.sortOrder < b.sortOrder ? -1 : a.sortOrder > b.sortOrder ? 1 : 0,
    )
    const dragged = sorted.find((n) => n.id === active.id)

    if (dragged?.type === 'SECTION') {
      handleSectionGroupDrag(active.id as string, over.id as string, sorted)
      return
    }

    // ── Single note reorder ──
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

    qc.setQueriesData({ queryKey: [['notes', 'list']] }, (old: any) => {
      if (!old || !Array.isArray(old.notes)) return old
      const updated: Note[] = old.notes.map((n: Note) =>
        n.id === active.id ? { ...n, sortOrder: newSortOrder } : n,
      )
      updated.sort((a, b) => (a.sortOrder < b.sortOrder ? -1 : a.sortOrder > b.sortOrder ? 1 : 0))
      return { ...old, notes: updated }
    })

    reorder.mutate({ id: active.id as string, newSortOrder })
  }

  function handleSectionGroupDrag(activeSectionId: string, overId: string, sortedNotes: Note[]) {
    const { prefix, groups } = buildSectionGroups(sortedNotes)

    const activeGroupIdx = groups.findIndex((g) => g.section.id === activeSectionId)
    if (activeGroupIdx === -1) return

    // Find which group the drop target belongs to
    const overGroupIdx = groups.findIndex(
      (g) => g.section.id === overId || g.members.some((n) => n.id === overId),
    )
    if (overGroupIdx === -1 || overGroupIdx === activeGroupIdx) return

    // Reorder groups: remove active, reinsert at overGroupIdx
    // Works correctly for both up and down movement (see analysis in comments)
    const newGroups = [...groups]
    const [activeGroup] = newGroups.splice(activeGroupIdx, 1)
    newGroups.splice(overGroupIdx, 0, activeGroup)

    // Rebuild flat list
    const newFlatList: Note[] = [
      ...prefix,
      ...newGroups.flatMap((g) => [g.section, ...g.members]),
    ]

    // Find the slice of the flat list occupied by the moved group
    const activeItems = [activeGroup.section, ...activeGroup.members]
    const firstIdx = newFlatList.findIndex((n) => n.id === activeSectionId)
    const lastIdx = firstIdx + activeItems.length - 1

    const prevNote = firstIdx > 0 ? newFlatList[firstIdx - 1] : null
    const nextNote = lastIdx < newFlatList.length - 1 ? newFlatList[lastIdx + 1] : null

    // Generate N evenly-spaced sort keys between prev and next
    const newKeys = generateNKeysBetween(
      prevNote?.sortOrder ?? null,
      nextNote?.sortOrder ?? null,
      activeItems.length,
    )
    const updates = activeItems.map((note, i) => ({ id: note.id, sortOrder: newKeys[i] }))

    // Optimistic update
    qc.setQueriesData({ queryKey: [['notes', 'list']] }, (old: any) => {
      if (!old || !Array.isArray(old.notes)) return old
      const sortOrderMap = new Map(updates.map((u) => [u.id, u.sortOrder]))
      const updated: Note[] = old.notes.map((n: Note) =>
        sortOrderMap.has(n.id) ? { ...n, sortOrder: sortOrderMap.get(n.id)! } : n,
      )
      updated.sort((a, b) => (a.sortOrder < b.sortOrder ? -1 : a.sortOrder > b.sortOrder ? 1 : 0))
      return { ...old, notes: updated }
    })

    reorderGroup.mutate(updates)
  }

  // When gridColumns > 0, override CSS auto-fill with a fixed column count
  const gridStyle: React.CSSProperties = viewMode === 'grid' && gridColumns > 0
    ? { gridTemplateColumns: `repeat(${gridColumns}, minmax(0, 1fr))` }
    : {}

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
        {activeNote ? <NoteCardGhost note={activeNote} memberCount={activeSectionMemberCount} /> : null}
      </DragOverlay>
    </DndContext>
  )
}
