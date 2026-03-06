import { trpc } from '@/api/client'
import { useQueryClient } from '@tanstack/react-query'
import { useUIStore } from '@/store/ui.store'
import { Archive, Trash2, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export function NoteMultiSelectBar() {
  const qc = useQueryClient()
  const selectedNoteIds = useUIStore((s) => s.selectedNoteIds)
  const clearNoteSelection = useUIStore((s) => s.clearNoteSelection)

  const archiveNote = trpc.notes.archive.useMutation()
  const trashNote = trpc.notes.trash.useMutation()

  if (selectedNoteIds.length === 0) return null

  function invalidate() {
    qc.invalidateQueries({ queryKey: [['notes']] })
    clearNoteSelection()
  }

  async function handleArchive() {
    await Promise.all(selectedNoteIds.map((id) => archiveNote.mutateAsync({ id })))
    invalidate()
  }

  async function handleTrash() {
    await Promise.all(selectedNoteIds.map((id) => trashNote.mutateAsync({ id })))
    invalidate()
  }

  const busy = archiveNote.isPending || trashNote.isPending

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-2xl border bg-background shadow-xl px-4 py-2.5 animate-in slide-in-from-bottom-4 duration-200">
      <span className="text-sm font-medium text-foreground mr-1">
        {selectedNoteIds.length} selected
      </span>
      <div className="w-px h-5 bg-border" />
      <button
        onClick={handleArchive}
        disabled={busy}
        className={cn(
          'flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg transition-colors',
          'hover:bg-accent text-muted-foreground hover:text-foreground',
          busy && 'opacity-50 pointer-events-none',
        )}
        title="Archive selected"
      >
        <Archive className="h-4 w-4" />
        Archive
      </button>
      <button
        onClick={handleTrash}
        disabled={busy}
        className={cn(
          'flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg transition-colors',
          'hover:bg-destructive/10 text-muted-foreground hover:text-destructive',
          busy && 'opacity-50 pointer-events-none',
        )}
        title="Move to trash"
      >
        <Trash2 className="h-4 w-4" />
        Trash
      </button>
      <div className="w-px h-5 bg-border" />
      <button
        onClick={clearNoteSelection}
        className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
        title="Cancel selection"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
