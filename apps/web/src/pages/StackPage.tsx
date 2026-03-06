import { useParams } from 'react-router-dom'
import { trpc } from '@/api/client'
import { NoteGrid } from '@/components/notes/NoteGrid'
import { NoteCreateBar } from '@/components/notes/NoteCreateBar'
import { useFilterStore } from '@/store/filter.store'
import { Layers } from 'lucide-react'

export function StackPage() {
  const { id } = useParams<{ id: string }>()
  const { searchQuery } = useFilterStore()

  const { data: stacks } = trpc.stacks.list.useQuery()
  const stack = stacks?.find((s) => s.id === id)

  const { data: notesData, isLoading } = trpc.notes.list.useQuery(
    { status: 'ACTIVE', stackId: id },
    { enabled: !!id },
  )

  const { data: searchResults } = trpc.search.query.useQuery(
    { q: searchQuery },
    { enabled: searchQuery.length > 0 },
  )

  const notes = searchQuery ? (searchResults ?? []) : (notesData?.notes ?? [])
  const isSearching = searchQuery.length > 0

  if (isLoading && !isSearching) {
    return (
      <div className="p-6 max-w-[1400px] mx-auto">
        <div className="note-grid">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="note-card-wrapper">
              <div className="rounded-lg border bg-secondary/30 animate-pulse h-32" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      {/* Stack header */}
      <div className="flex items-center gap-2">
        <Layers className="h-5 w-5 text-muted-foreground" />
        <h1 className="text-xl font-semibold">{stack?.name ?? 'Stack'}</h1>
      </div>

      {!isSearching && <NoteCreateBar stackId={id} />}

      {isSearching && (
        <p className="text-sm text-muted-foreground">
          Search results for <strong>"{searchQuery}"</strong>
        </p>
      )}

      {notes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
          <Layers className="h-16 w-16 mb-4 opacity-20" />
          <p className="text-lg font-medium">
            {isSearching ? 'No results found' : 'No notes in this stack'}
          </p>
          <p className="text-sm">
            {isSearching ? 'Try a different search term' : 'Start by creating a new note above'}
          </p>
        </div>
      ) : (
        <NoteGrid notes={notes} view="active" showPinnedSection={!isSearching} />
      )}
    </div>
  )
}
