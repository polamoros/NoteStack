import { trpc } from '@/api/client'
import { NoteGrid } from '@/components/notes/NoteGrid'
import { NoteCreateBar } from '@/components/notes/NoteCreateBar'
import { useFilterStore } from '@/store/filter.store'
import { useDebounce } from '@/hooks/useDebounce'
import { FileText } from 'lucide-react'

export function NotesPage() {
  const { searchQuery, activeLabelId } = useFilterStore()

  const { data: notesData, isLoading } = trpc.notes.list.useQuery({
    status: 'ACTIVE',
    labelId: activeLabelId ?? undefined,
  })

  const { data: searchResults } = trpc.search.query.useQuery(
    { q: searchQuery },
    { enabled: searchQuery.length > 0 },
  )

  const notes = searchQuery ? (searchResults ?? []) : (notesData?.notes ?? [])
  const isSearching = searchQuery.length > 0

  if (isLoading && !isSearching) {
    return (
      <div className="p-6">
        <div className="note-grid">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="note-card-wrapper">
              <div className="rounded-lg border bg-secondary/30 animate-pulse h-32" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {!isSearching && (
        <NoteCreateBar />
      )}

      {isSearching && (
        <p className="text-sm text-muted-foreground">
          Search results for <strong>"{searchQuery}"</strong>
        </p>
      )}

      {notes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
          <FileText className="h-16 w-16 mb-4 opacity-20" />
          <p className="text-lg font-medium">
            {isSearching ? 'No results found' : 'No notes yet'}
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
