import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors, closestCenter } from '@dnd-kit/core'
import { SortableContext, useSortable, rectSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { generateKeyBetween } from 'fractional-indexing'
import { trpc } from '@/api/client'
import { useQueryClient } from '@tanstack/react-query'
import { NoteCard } from './NoteCard'
import type { Note } from '@notes/shared'
import { cn } from '@/lib/utils'
import { useUIStore } from '@/store/ui.store'

interface NoteGridProps {
  notes: Note[]
  view?: 'active' | 'archived' | 'trashed'
  showPinnedSection?: boolean
}

function SortableNoteCard({ note, view }: { note: Note; view: 'active' | 'archived' | 'trashed' }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: note.id,
    disabled: view !== 'active',
  })

  return (
    <div
      ref={setNodeRef}
      className={cn('note-card-wrapper', isDragging && 'opacity-50')}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      {...attributes}
      {...listeners}
    >
      <NoteCard note={note} view={view} />
    </div>
  )
}

export function NoteGrid({ notes, view = 'active', showPinnedSection = true }: NoteGridProps) {
  const qc = useQueryClient()
  const { viewMode } = useUIStore()
  const reorder = trpc.notes.reorder.useMutation()

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  )

  const pinned = notes.filter((n) => n.isPinned)
  const unpinned = notes.filter((n) => !n.isPinned)

  function handleDragEnd(event: DragEndEvent) {
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

    // Optimistic update
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

  const gridClass = cn(
    viewMode === 'grid' ? 'note-grid' : 'flex flex-col gap-2 max-w-2xl mx-auto',
  )

  if (!showPinnedSection || pinned.length === 0) {
    return (
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={notes.map((n) => n.id)} strategy={rectSortingStrategy}>
          <div className={gridClass}>
            {notes.map((note) => (
              <SortableNoteCard key={note.id} note={note} view={view} />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    )
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={notes.map((n) => n.id)} strategy={rectSortingStrategy}>
        {pinned.length > 0 && (
          <section className="mb-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 px-1">
              Pinned
            </p>
            <div className={gridClass}>
              {pinned.map((note) => (
                <SortableNoteCard key={note.id} note={note} view={view} />
              ))}
            </div>
          </section>
        )}

        {unpinned.length > 0 && (
          <section>
            {pinned.length > 0 && (
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 px-1">
                Others
              </p>
            )}
            <div className={gridClass}>
              {unpinned.map((note) => (
                <SortableNoteCard key={note.id} note={note} view={view} />
              ))}
            </div>
          </section>
        )}
      </SortableContext>
    </DndContext>
  )
}
