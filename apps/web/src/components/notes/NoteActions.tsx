import { Pin, PinOff, Archive, ArchiveRestore, Trash2, Copy, MoreHorizontal, BellRing } from 'lucide-react'
import { trpc } from '@/api/client'
import { useQueryClient } from '@tanstack/react-query'
import { ColorPicker } from './ColorPicker'
import { SizePicker } from './SizePicker'
import { LabelSelector } from '@/components/labels/LabelSelector'
import { ReminderPicker } from '@/components/reminders/ReminderPicker'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { Note } from '@notes/shared'

interface NoteActionsProps {
  note: Note
  onEdit?: () => void
  view?: 'active' | 'archived' | 'trashed'
}

export function NoteActions({ note, onEdit: _onEdit, view = 'active' }: NoteActionsProps) {
  const qc = useQueryClient()

  function invalidate() {
    qc.invalidateQueries({ queryKey: [['notes']] })
    qc.invalidateQueries({ queryKey: [['search']] })
  }

  const updateNote = trpc.notes.update.useMutation({ onSuccess: invalidate })
  const trashNote = trpc.notes.trash.useMutation({ onSuccess: invalidate })
  const restoreNote = trpc.notes.restore.useMutation({ onSuccess: invalidate })
  const archiveNote = trpc.notes.archive.useMutation({ onSuccess: invalidate })
  const unarchiveNote = trpc.notes.unarchive.useMutation({ onSuccess: invalidate })
  const pinNote = trpc.notes.pin.useMutation({ onSuccess: invalidate })
  const deleteNote = trpc.notes.delete.useMutation({ onSuccess: invalidate })
  const createNote = trpc.notes.create.useMutation({ onSuccess: invalidate })

  function handlePin() {
    pinNote.mutate({ id: note.id, isPinned: !note.isPinned })
  }

  function handleColorChange(color: Note['color']) {
    updateNote.mutate({ id: note.id, color })
  }

  function handleSizeChange(size: Note['size']) {
    updateNote.mutate({ id: note.id, size })
  }

  function handleDuplicate() {
    createNote.mutate({
      title: note.title ? `${note.title} (copy)` : '',
      type: note.type,
      color: note.color,
      size: note.size,
      content: note.content ?? undefined,
    })
  }

  if (view === 'trashed') {
    return (
      <div className="flex items-center gap-0.5">
        <button
          onClick={() => restoreNote.mutate({ id: note.id })}
          className="p-1.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
          title="Restore"
        >
          <ArchiveRestore className="h-4 w-4" />
        </button>
        <button
          onClick={() => deleteNote.mutate({ id: note.id })}
          className="p-1.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors text-destructive"
          title="Delete permanently"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
      {/* Pin */}
      <button
        onClick={handlePin}
        className="p-1.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
        title={note.isPinned ? 'Unpin' : 'Pin'}
      >
        {note.isPinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
      </button>

      {/* Reminder */}
      <ReminderPicker noteId={note.id} reminders={note.reminders} />

      {/* Color */}
      <ColorPicker value={note.color} onChange={handleColorChange} />

      {/* Size */}
      <SizePicker value={note.size} onChange={handleSizeChange} />

      {/* Labels */}
      <LabelSelector noteId={note.id} attachedLabels={note.labels} />

      {/* More menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="p-1.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
            title="More"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={handleDuplicate}>
            <Copy className="h-4 w-4 mr-2" />
            Duplicate
          </DropdownMenuItem>
          {view === 'active' && (
            <DropdownMenuItem onClick={() => archiveNote.mutate({ id: note.id })}>
              <Archive className="h-4 w-4 mr-2" />
              Archive
            </DropdownMenuItem>
          )}
          {view === 'archived' && (
            <DropdownMenuItem onClick={() => unarchiveNote.mutate({ id: note.id })}>
              <ArchiveRestore className="h-4 w-4 mr-2" />
              Unarchive
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            className="text-destructive"
            onClick={() => trashNote.mutate({ id: note.id })}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Move to trash
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
