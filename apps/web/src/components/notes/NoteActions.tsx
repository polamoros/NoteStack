import { useState } from 'react'
import { Pin, PinOff, Archive, ArchiveRestore, Trash2, Copy, MoreHorizontal, Share2, CheckSquare, Layers, Inbox } from 'lucide-react'
import { trpc } from '@/api/client'
import { useQueryClient } from '@tanstack/react-query'
import { ColorPicker } from './ColorPicker'
import { SizePicker } from './SizePicker'
import { LabelSelector } from '@/components/labels/LabelSelector'
import { ReminderPicker } from '@/components/reminders/ReminderPicker'
import { NoteShareDialog } from './NoteShareDialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { Note } from '@notes/shared'
import { useUIStore } from '@/store/ui.store'

interface NoteActionsProps {
  note: Note
  onEdit?: () => void
  view?: 'active' | 'archived' | 'trashed'
  compact?: boolean
}

export function NoteActions({ note, onEdit: _onEdit, view = 'active', compact = false }: NoteActionsProps) {
  const qc = useQueryClient()
  const [shareOpen, setShareOpen] = useState(false)
  const toggleNoteSelection = useUIStore((s) => s.toggleNoteSelection)
  const { data: stacks = [] } = trpc.stacks.list.useQuery()

  const iconCls = compact ? 'h-3.5 w-3.5' : 'h-4 w-4'
  const btnCls = `${compact ? 'p-1' : 'p-1.5'} rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors`

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
          className={btnCls}
          title="Restore"
        >
          <ArchiveRestore className={iconCls} />
        </button>
        <button
          onClick={() => deleteNote.mutate({ id: note.id })}
          className={`${btnCls} text-destructive`}
          title="Delete permanently"
        >
          <Trash2 className={iconCls} />
        </button>
      </div>
    )
  }

  return (
    <>
      <div className={`flex items-center ${compact ? 'gap-0' : 'gap-0.5'}`} onClick={(e) => e.stopPropagation()}>
        {/* Pin */}
        <button
          onClick={handlePin}
          className={btnCls}
          title={note.isPinned ? 'Unpin' : 'Pin'}
        >
          {note.isPinned ? <PinOff className={iconCls} /> : <Pin className={iconCls} />}
        </button>

        {/* Reminder */}
        <ReminderPicker noteId={note.id} reminders={note.reminders} compact={compact} />

        {/* Color */}
        <ColorPicker value={note.color} onChange={handleColorChange} compact={compact} />

        {/* Size */}
        <SizePicker value={note.size} onChange={handleSizeChange} compact={compact} />

        {/* Labels */}
        <LabelSelector noteId={note.id} attachedLabels={note.labels} compact={compact} />

        {/* More menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className={btnCls} title="More">
              <MoreHorizontal className={iconCls} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => toggleNoteSelection(note.id)}>
              <CheckSquare className="h-4 w-4 mr-2" />
              Select
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleDuplicate}>
              <Copy className="h-4 w-4 mr-2" />
              Duplicate
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setShareOpen(true)}>
              <Share2 className="h-4 w-4 mr-2" />
              Share
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {/* Move to stack */}
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <Layers className="h-4 w-4 mr-2" />
                Move to stack
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuItem
                  onClick={() => updateNote.mutate({ id: note.id, stackId: null })}
                  className={note.stackId === null ? 'font-medium' : ''}
                >
                  <Inbox className="h-4 w-4 mr-2" />
                  Inbox (no stack)
                </DropdownMenuItem>
                {stacks.map((stack) => (
                  <DropdownMenuItem
                    key={stack.id}
                    onClick={() => updateNote.mutate({ id: note.id, stackId: stack.id })}
                    className={note.stackId === stack.id ? 'font-medium' : ''}
                  >
                    <Layers className="h-4 w-4 mr-2" style={stack.color ? { color: stack.color } : undefined} />
                    {stack.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSeparator />
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

      <NoteShareDialog note={note} open={shareOpen} onOpenChange={setShareOpen} />
    </>
  )
}
