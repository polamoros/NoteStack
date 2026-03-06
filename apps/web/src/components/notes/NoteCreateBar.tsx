import { useState, useRef } from 'react'
import { trpc } from '@/api/client'
import { useQueryClient } from '@tanstack/react-query'
import { CheckSquare, Layers, Type, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { NoteType } from '@notes/shared'
import { NoteEditor } from './NoteEditor'

interface NoteCreateBarProps {
  stackId?: string | null
}

export function NoteCreateBar({ stackId }: NoteCreateBarProps = {}) {
  const qc = useQueryClient()
  const [expanded, setExpanded] = useState(false)
  const [title, setTitle] = useState('')
  // Tracks which type is visually selected (but note is only created when title is non-empty)
  const [selectedType, setSelectedType] = useState<NoteType>('RICH')
  const [createdNote, setCreatedNote] = useState<any>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const createNote = trpc.notes.create.useMutation({
    onSuccess: (note) => {
      qc.invalidateQueries({ queryKey: [['notes']] })
      // Don't open editor for SECTION notes — they're edited inline in the grid
      if ((note as any).type !== 'SECTION') {
        setCreatedNote(note)
      }
      setTitle('')
      setSelectedType('RICH')
      setExpanded(false)
    },
  })

  const trashNote = trpc.notes.trash.useMutation({
    onSuccess: () => qc.invalidateQueries({ queryKey: [['notes']] }),
  })

  /**
   * Called when a type button is clicked.
   *   - Always creates the note immediately so the editor opens right away.
   *   - SECTION: title defaults to "Section" if blank.
   *   - Others: creates with whatever title is in the input (may be empty).
   *   If the user closes the editor without writing anything, the note is trashed.
   */
  function handleTypeClick(type: NoteType) {
    if (type === 'SECTION') {
      createNote.mutate({
        title: title.trim() || 'Section',
        type: 'SECTION',
        stackId: stackId ?? undefined,
      })
      return
    }
    createNote.mutate({ title: title.trim(), type, stackId: stackId ?? undefined })
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      createNote.mutate({ title: title.trim(), type: selectedType, stackId: stackId ?? undefined })
    }
    if (e.key === 'Escape') {
      setExpanded(false)
      setTitle('')
      setSelectedType('RICH')
    }
  }

  function handleClose() {
    setExpanded(false)
    setTitle('')
    setSelectedType('RICH')
  }

  return (
    <>
      <div className="w-full max-w-2xl mx-auto">
        <div
          className={cn(
            'rounded-lg border bg-background shadow-sm transition-shadow',
            expanded ? 'shadow-md' : 'hover:shadow-md cursor-text',
          )}
          onClick={() => !expanded && setExpanded(true)}
        >
          {/* Title input */}
          <input
            ref={inputRef}
            className={cn(
              'w-full bg-transparent px-4 py-3 text-sm placeholder:text-muted-foreground outline-none',
              expanded ? 'border-b border-border' : '',
            )}
            placeholder={
              expanded
                ? selectedType === 'TODO'
                  ? 'Todo list title…'
                  : selectedType === 'TASK'
                    ? 'Task title…'
                    : 'Take a note…'
                : 'Take a note…'
            }
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setExpanded(true)}
          />

          {/* Expanded: type buttons */}
          {expanded && (
            <div className="flex items-center justify-between px-3 py-2">
              <div className="flex items-center gap-1">
                <TypeButton
                  icon={<Type className="h-4 w-4" />}
                  label="Note"
                  selected={selectedType === 'RICH'}
                  onClick={() => handleTypeClick('RICH')}
                  disabled={createNote.isPending}
                />
                <TypeButton
                  icon={<CheckSquare className="h-4 w-4" />}
                  label="Todo"
                  selected={selectedType === 'TODO'}
                  onClick={() => handleTypeClick('TODO')}
                  disabled={createNote.isPending}
                />
                <TypeButton
                  icon={<Layers className="h-4 w-4" />}
                  label="Task"
                  selected={selectedType === 'TASK'}
                  onClick={() => handleTypeClick('TASK')}
                  disabled={createNote.isPending}
                />
                <div className="w-px h-4 bg-border mx-0.5" />
                <TypeButton
                  icon={<Minus className="h-4 w-4" />}
                  label="Section"
                  selected={false}
                  onClick={() => handleTypeClick('SECTION' as NoteType)}
                  disabled={createNote.isPending}
                  title="Add a section separator to the grid"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded"
                  onClick={handleClose}
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {createdNote && (
        <NoteEditor
          note={createdNote}
          onClose={() => setCreatedNote(null)}
          onEmptyClose={(id) => trashNote.mutate({ id })}
        />
      )}
    </>
  )
}

function TypeButton({
  icon,
  label,
  selected,
  onClick,
  disabled,
  title,
}: {
  icon: React.ReactNode
  label: string
  selected: boolean
  onClick: () => void
  disabled?: boolean
  title?: string
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        'flex items-center gap-1.5 px-2 py-1.5 rounded-md text-sm transition-colors',
        selected
          ? 'bg-primary/10 text-primary font-medium'
          : 'text-muted-foreground hover:bg-accent hover:text-foreground',
        disabled && 'opacity-50 pointer-events-none',
      )}
    >
      {icon}
      <span>{label}</span>
    </button>
  )
}
