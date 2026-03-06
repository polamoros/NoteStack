import { trpc } from '@/api/client'
import { useQueryClient } from '@tanstack/react-query'
import { useUIStore } from '@/store/ui.store'
import { Archive, Trash2, X, Tag, Check, Minus as MinusIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { LabelIcon } from '@/components/labels/LabelIcon'

export function NoteMultiSelectBar() {
  const qc = useQueryClient()
  const selectedNoteIds = useUIStore((s) => s.selectedNoteIds)
  const clearNoteSelection = useUIStore((s) => s.clearNoteSelection)

  const { data: allLabels = [] } = trpc.labels.list.useQuery()
  const archiveNote = trpc.notes.archive.useMutation()
  const trashNote = trpc.notes.trash.useMutation()
  const attachLabel = trpc.labels.attach.useMutation()
  const detachLabel = trpc.labels.detach.useMutation()

  if (selectedNoteIds.length === 0) return null

  // Get notes from cache to compute per-label attachment state
  const cachedNotes: any[] = (qc.getQueryData([['notes', 'list']]) as any)?.notes ?? []
  const selectedNotes = cachedNotes.filter((n: any) => selectedNoteIds.includes(n.id))

  function getLabelState(labelId: string): 'all' | 'some' | 'none' {
    if (selectedNotes.length === 0) return 'none'
    const attachedCount = selectedNotes.filter((n: any) =>
      (n.labels ?? []).some((l: any) => l.id === labelId),
    ).length
    if (attachedCount === 0) return 'none'
    if (attachedCount === selectedNotes.length) return 'all'
    return 'some'
  }

  async function toggleLabel(labelId: string) {
    const state = getLabelState(labelId)
    if (state === 'all') {
      await Promise.all(selectedNoteIds.map((noteId) => detachLabel.mutateAsync({ noteId, labelId })))
    } else {
      await Promise.all(selectedNoteIds.map((noteId) => attachLabel.mutateAsync({ noteId, labelId })))
    }
    qc.invalidateQueries({ queryKey: [['notes']] })
  }

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
  const labelBusy = attachLabel.isPending || detachLabel.isPending

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-2xl border bg-background shadow-xl px-4 py-2.5 animate-in slide-in-from-bottom-4 duration-200">
      <span className="text-sm font-medium text-foreground mr-1">
        {selectedNoteIds.length} selected
      </span>
      <div className="w-px h-5 bg-border" />

      {/* Label management */}
      <Popover>
        <PopoverTrigger asChild>
          <button
            disabled={labelBusy}
            className={cn(
              'flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg transition-colors',
              'hover:bg-accent text-muted-foreground hover:text-foreground',
              labelBusy && 'opacity-50 pointer-events-none',
            )}
            title="Apply labels to selected notes"
          >
            <Tag className="h-4 w-4" />
            Label
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-2" align="center" side="top">
          <p className="text-xs font-medium text-muted-foreground px-2 py-1">Apply labels</p>
          {allLabels.length === 0 && (
            <p className="text-xs text-muted-foreground px-2 py-2">No labels yet. Create one in the sidebar.</p>
          )}
          {allLabels.map((label) => {
            const state = getLabelState(label.id)
            return (
              <button
                key={label.id}
                onClick={() => toggleLabel(label.id)}
                className="flex items-center gap-2 w-full px-2 py-1.5 rounded text-sm hover:bg-accent transition-colors"
              >
                <div
                  className={cn(
                    'h-4 w-4 rounded-sm border flex items-center justify-center shrink-0',
                    state === 'all'
                      ? 'bg-primary border-primary'
                      : state === 'some'
                        ? 'bg-primary/40 border-primary/40'
                        : 'border-muted-foreground/40',
                  )}
                >
                  {state === 'all' && <Check className="h-3 w-3 text-primary-foreground" />}
                  {state === 'some' && <MinusIcon className="h-2.5 w-2.5 text-primary-foreground" />}
                </div>
                <LabelIcon icon={label.icon} color={label.color} size={13} />
                <span
                  className="truncate flex-1"
                  style={label.color ? { color: label.color } : undefined}
                >
                  {label.name}
                </span>
              </button>
            )
          })}
        </PopoverContent>
      </Popover>

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
