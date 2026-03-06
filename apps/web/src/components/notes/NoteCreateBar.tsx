import { useState } from 'react'
import { trpc } from '@/api/client'
import { useQueryClient } from '@tanstack/react-query'
import { CheckSquare, Layers, Type } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { NoteType } from '@notes/shared'
import { NoteEditor } from './NoteEditor'

export function NoteCreateBar() {
  const qc = useQueryClient()
  const [expanded, setExpanded] = useState(false)
  const [title, setTitle] = useState('')
  const [createdNote, setCreatedNote] = useState<any>(null)

  const createNote = trpc.notes.create.useMutation({
    onSuccess: (note) => {
      qc.invalidateQueries({ queryKey: [['notes']] })
      setCreatedNote(note)
      setTitle('')
      setExpanded(false)
    },
  })

  function handleTypeCreate(type: NoteType) {
    createNote.mutate({ title, type })
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleTypeCreate('RICH')
    }
    if (e.key === 'Escape') {
      setExpanded(false)
      setTitle('')
    }
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
            className={cn(
              'w-full bg-transparent px-4 py-3 text-sm placeholder:text-muted-foreground outline-none',
              expanded ? 'border-b border-border' : '',
            )}
            placeholder={expanded ? 'Title' : 'Take a note…'}
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
                  onClick={() => handleTypeCreate('RICH')}
                />
                <TypeButton
                  icon={<CheckSquare className="h-4 w-4" />}
                  label="Todo"
                  onClick={() => handleTypeCreate('TODO')}
                />
                <TypeButton
                  icon={<Layers className="h-4 w-4" />}
                  label="Task"
                  onClick={() => handleTypeCreate('TASK')}
                />
              </div>
              <button
                className="text-sm text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded"
                onClick={() => { setExpanded(false); setTitle('') }}
              >
                Close
              </button>
            </div>
          )}
        </div>
      </div>

      {createdNote && (
        <NoteEditor note={createdNote} onClose={() => setCreatedNote(null)} />
      )}
    </>
  )
}

function TypeButton({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-2 py-1.5 rounded-md text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
    >
      {icon}
      <span>{label}</span>
    </button>
  )
}
