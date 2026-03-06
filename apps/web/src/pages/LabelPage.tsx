import { useParams } from 'react-router-dom'
import { trpc } from '@/api/client'
import { NoteGrid } from '@/components/notes/NoteGrid'
import { NoteCreateBar } from '@/components/notes/NoteCreateBar'
import { Tag } from 'lucide-react'

export function LabelPage() {
  const { id } = useParams<{ id: string }>()
  const { data: labels } = trpc.labels.list.useQuery()
  const { data, isLoading } = trpc.notes.list.useQuery({
    status: 'ACTIVE',
    labelId: id,
  })

  const label = labels?.find((l) => l.id === id)
  const notes = data?.notes ?? []

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-2">
        <Tag className="h-5 w-5" />
        <h1 className="text-xl font-semibold">{label?.name ?? 'Label'}</h1>
      </div>

      <NoteCreateBar />

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
          <Tag className="h-16 w-16 mb-4 opacity-20" />
          <p className="text-lg font-medium">No notes with this label</p>
        </div>
      )}

      {notes.length > 0 && <NoteGrid notes={notes} view="active" />}
    </div>
  )
}
