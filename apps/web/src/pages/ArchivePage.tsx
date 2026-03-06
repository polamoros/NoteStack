import { trpc } from '@/api/client'
import { NoteGrid } from '@/components/notes/NoteGrid'
import { Archive } from 'lucide-react'

export function ArchivePage() {
  const { data, isLoading } = trpc.notes.list.useQuery({ status: 'ARCHIVED' })
  const notes = data?.notes ?? []

  return (
    <div className="p-6 space-y-4 max-w-[1400px] mx-auto">
      <h1 className="text-xl font-semibold">Archive</h1>

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
          <Archive className="h-16 w-16 mb-4 opacity-20" />
          <p className="text-lg font-medium">No archived notes</p>
          <p className="text-sm">Notes you archive will appear here</p>
        </div>
      )}

      {notes.length > 0 && (
        <NoteGrid notes={notes} view="archived" showPinnedSection={false} />
      )}
    </div>
  )
}
