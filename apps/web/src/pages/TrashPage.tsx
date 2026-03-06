import { trpc } from '@/api/client'
import { NoteGrid } from '@/components/notes/NoteGrid'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Trash2 } from 'lucide-react'
import { daysUntilPurge } from '@/lib/utils'

export function TrashPage() {
  const qc = useQueryClient()
  const { data, isLoading } = trpc.notes.list.useQuery({ status: 'TRASHED' })
  const notes = data?.notes ?? []

  const bulkTrash = trpc.notes.bulkTrash.useMutation({
    onSuccess: () => qc.invalidateQueries({ queryKey: [['notes']] }),
  })

  function emptyTrash() {
    if (notes.length === 0) return
    if (!confirm('Permanently delete all trashed notes? This cannot be undone.')) return
    bulkTrash.mutate({ ids: notes.map((n) => n.id) })
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Trash</h1>
          <p className="text-sm text-muted-foreground">
            Notes in trash are deleted automatically after 30 days
          </p>
        </div>
        {notes.length > 0 && (
          <Button variant="destructive" size="sm" onClick={emptyTrash}>
            Empty trash
          </Button>
        )}
      </div>

      {isLoading && (
        <div className="note-grid">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="note-card-wrapper">
              <div className="rounded-lg border bg-secondary/30 animate-pulse h-32" />
            </div>
          ))}
        </div>
      )}

      {!isLoading && notes.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
          <Trash2 className="h-16 w-16 mb-4 opacity-20" />
          <p className="text-lg font-medium">Trash is empty</p>
          <p className="text-sm">Notes you delete will appear here for 30 days</p>
        </div>
      )}

      {notes.length > 0 && (
        <div className="space-y-2">
          {notes.map((note) => (
            <div key={note.id} className="text-xs text-muted-foreground px-1">
              Deletes in {daysUntilPurge(note.trashedAt!)} day{daysUntilPurge(note.trashedAt!) !== 1 ? 's' : ''}
            </div>
          ))}
          <NoteGrid notes={notes} view="trashed" showPinnedSection={false} />
        </div>
      )}
    </div>
  )
}
