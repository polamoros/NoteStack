import { useState, useEffect } from 'react'
import { trpc } from '@/api/client'
import { useQueryClient } from '@tanstack/react-query'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import type { Note, NoteLabel } from '@notes/shared'
import { cn, getNoteColorStyle } from '@/lib/utils'
import { NoteEditorRich } from './NoteEditorRich'
import { NoteEditorTodo } from './NoteEditorTodo'
import { NoteEditorTask } from './NoteEditorTask'
import { NoteActions } from './NoteActions'
import { useDebounce } from '@/hooks/useDebounce'
import { Loader2, Check } from 'lucide-react'

interface NoteEditorProps {
  note: Note
  onClose: () => void
  /** Called with the note id if the editor is closed while the note has no content. */
  onEmptyClose?: (noteId: string) => void
}

export function NoteEditor({ note, onClose, onEmptyClose }: NoteEditorProps) {
  const qc = useQueryClient()
  const [title, setTitle] = useState(note.title)
  const [content, setContent] = useState(note.content)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const debouncedTitle = useDebounce(title, 500)
  const debouncedContent = useDebounce(content, 800)

  const hasPendingChanges = title !== debouncedTitle || content !== debouncedContent

  const updateNote = trpc.notes.update.useMutation({
    onMutate: () => setSaveStatus('saving'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [['notes']] })
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 2000)
    },
    onError: () => setSaveStatus('idle'),
  })

  // Auto-save title
  useEffect(() => {
    if (debouncedTitle !== note.title) {
      updateNote.mutate({ id: note.id, title: debouncedTitle })
    }
  }, [debouncedTitle]) // eslint-disable-line

  // Auto-save content (RICH type)
  useEffect(() => {
    if (note.type === 'RICH' && debouncedContent !== note.content) {
      updateNote.mutate({ id: note.id, content: debouncedContent ?? undefined })
    }
  }, [debouncedContent]) // eslint-disable-line

  // Fetch latest note data
  const { data: latestNote } = trpc.notes.get.useQuery({ id: note.id }, {
    initialData: note,
    refetchOnWindowFocus: false,
  })

  const currentNote = latestNote ?? note

  function handleClose() {
    const isEmpty =
      !title.trim() &&
      !content &&
      currentNote.todoItems.length === 0 &&
      currentNote.taskSteps.length === 0
    if (isEmpty && onEmptyClose) onEmptyClose(note.id)
    onClose()
  }
  const { className: colorClass, style: colorStyle } = getNoteColorStyle(currentNote.color)

  return (
    <Dialog open onOpenChange={(open) => !open && handleClose()}>
      <DialogContent
        className={cn('max-w-lg w-full p-0 gap-0 overflow-hidden', colorClass)}
        style={colorStyle}
      >
        {/* Title */}
        <div className="px-4 pt-4">
          <input
            className="w-full bg-transparent text-base font-semibold outline-none placeholder:text-muted-foreground"
            placeholder="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        {/* Body */}
        <div className="px-4 py-2 max-h-[60vh] overflow-y-auto">
          {currentNote.type === 'RICH' && (
            <NoteEditorRich
              content={content}
              onChange={setContent}
            />
          )}
          {currentNote.type === 'TODO' && (
            <NoteEditorTodo noteId={note.id} items={currentNote.todoItems} />
          )}
          {currentNote.type === 'TASK' && (
            <NoteEditorTask noteId={note.id} steps={currentNote.taskSteps} />
          )}
        </div>

        {/* Labels */}
        {currentNote.labels.length > 0 && (
          <div className="px-4 pb-2 flex flex-wrap gap-1">
            {currentNote.labels.map((label: NoteLabel) => (
              <span
                key={label.id}
                className="text-xs px-2 py-0.5 rounded-full bg-black/10 dark:bg-white/10"
              >
                {label.name}
              </span>
            ))}
          </div>
        )}

        {/* Footer actions */}
        <div className="flex items-center justify-between px-3 py-2 border-t bg-inherit">
          <NoteActions note={currentNote} />
          <div className="flex items-center gap-3">
            {/* Save status indicator */}
            <span className="text-xs text-muted-foreground flex items-center gap-1 min-w-[60px] justify-end">
              {hasPendingChanges && 'Editing…'}
              {!hasPendingChanges && saveStatus === 'saving' && (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Saving…
                </>
              )}
              {!hasPendingChanges && saveStatus === 'saved' && (
                <>
                  <Check className="h-3 w-3" />
                  Saved
                </>
              )}
            </span>
            <button
              className="text-sm text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded"
              onClick={handleClose}
            >
              Close
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
