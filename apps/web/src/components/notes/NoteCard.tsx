import { useState } from 'react'
import { cn, NOTE_COLOR_CLASSES } from '@/lib/utils'
import type { Note } from '@notes/shared'
import { NoteActions } from './NoteActions'
import { NoteEditor } from './NoteEditor'
import { Pin, Bell } from 'lucide-react'
import { formatReminderDate } from '@/lib/utils'

const SIZE_CLASSES = {
  SMALL: 'min-h-[80px]',
  MEDIUM: 'min-h-[160px]',
  LARGE: 'min-h-[280px]',
  AUTO: '',
}

interface NoteCardProps {
  note: Note
  view?: 'active' | 'archived' | 'trashed'
}

export function NoteCard({ note, view = 'active' }: NoteCardProps) {
  const [editorOpen, setEditorOpen] = useState(false)
  const [hovered, setHovered] = useState(false)

  const nextReminder = note.reminders.find((r) => r.nextOccurrence && !r.isAcknowledged)

  return (
    <>
      <div
        className={cn(
          'relative rounded-lg border cursor-pointer transition-shadow duration-150 group',
          'hover:shadow-md',
          NOTE_COLOR_CLASSES[note.color],
          SIZE_CLASSES[note.size],
        )}
        onClick={() => view !== 'trashed' && setEditorOpen(true)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {/* Pin indicator */}
        {note.isPinned && (
          <div className="absolute top-2 right-2">
            <Pin className="h-3.5 w-3.5 text-muted-foreground rotate-45" />
          </div>
        )}

        {/* Note content */}
        <div className="p-3">
          {/* Title */}
          {note.title && (
            <h3 className="font-medium text-sm mb-1 pr-6 leading-snug">{note.title}</h3>
          )}

          {/* Body by type */}
          {note.type === 'RICH' && note.content && (
            <NoteRichPreview content={note.content} />
          )}
          {note.type === 'TODO' && note.todoItems.length > 0 && (
            <NoteTodoPreview items={note.todoItems} />
          )}
          {note.type === 'TASK' && note.taskSteps.length > 0 && (
            <NoteTaskPreview steps={note.taskSteps} />
          )}

          {/* Labels */}
          {note.labels.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {note.labels.map((label) => (
                <span
                  key={label.id}
                  className="text-xs px-2 py-0.5 rounded-full bg-black/10 dark:bg-white/10"
                >
                  {label.name}
                </span>
              ))}
            </div>
          )}

          {/* Reminder badge */}
          {nextReminder && (
            <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
              <Bell className="h-3 w-3" />
              <span>{formatReminderDate(nextReminder.nextOccurrence!)}</span>
            </div>
          )}
        </div>

        {/* Action toolbar (shown on hover) */}
        <div
          className={cn(
            'absolute bottom-2 left-2 right-2 flex items-center justify-end transition-opacity duration-100',
            hovered ? 'opacity-100' : 'opacity-0',
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <NoteActions note={note} view={view} onEdit={() => setEditorOpen(true)} />
        </div>
      </div>

      {editorOpen && (
        <NoteEditor note={note} onClose={() => setEditorOpen(false)} />
      )}
    </>
  )
}

function NoteRichPreview({ content }: { content: string }) {
  try {
    // Extract plain text from Tiptap JSON for preview
    const doc = JSON.parse(content)
    const text = extractText(doc)
    if (!text) return null
    return (
      <p className="text-sm text-muted-foreground line-clamp-6 whitespace-pre-wrap">{text}</p>
    )
  } catch {
    return <p className="text-sm text-muted-foreground">{content.slice(0, 200)}</p>
  }
}

function extractText(node: any): string {
  if (node.type === 'text') return node.text ?? ''
  if (!node.content) return ''
  return node.content.map(extractText).join(node.type === 'paragraph' ? '\n' : '')
}

function NoteTodoPreview({ items }: { items: Note['todoItems'] }) {
  const visible = items.slice(0, 5)
  const remaining = items.length - visible.length
  const done = items.filter((i) => i.isChecked).length
  return (
    <div className="space-y-0.5">
      {visible.map((item) => (
        <div key={item.id} className="flex items-start gap-2 text-sm">
          <div
            className={cn(
              'mt-0.5 h-4 w-4 shrink-0 rounded-sm border border-current flex items-center justify-center',
              item.isChecked && 'opacity-50',
            )}
          >
            {item.isChecked && <span className="text-xs">✓</span>}
          </div>
          <span className={cn(item.isChecked && 'line-through opacity-50')}>{item.text}</span>
        </div>
      ))}
      {remaining > 0 && (
        <p className="text-xs text-muted-foreground pl-6">+{remaining} more items</p>
      )}
      {items.length > 0 && (
        <div className="mt-1 h-1 w-full rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
          <div
            className="h-full bg-green-500/60 rounded-full transition-all"
            style={{ width: `${(done / items.length) * 100}%` }}
          />
        </div>
      )}
    </div>
  )
}

function NoteTaskPreview({ steps }: { steps: Note['taskSteps'] }) {
  const visible = steps.slice(0, 4)
  const remaining = steps.length - visible.length
  const done = steps.filter((s) => s.isComplete).length
  return (
    <div className="space-y-0.5">
      {visible.map((step) => (
        <div key={step.id} className="flex items-start gap-2 text-sm">
          <div
            className={cn(
              'mt-0.5 h-4 w-4 shrink-0 rounded-full border border-current flex items-center justify-center',
              step.isComplete && 'opacity-50',
            )}
          >
            {step.isComplete && <span className="text-xs">✓</span>}
          </div>
          <span className={cn(step.isComplete && 'line-through opacity-50')}>{step.title}</span>
        </div>
      ))}
      {remaining > 0 && (
        <p className="text-xs text-muted-foreground pl-6">+{remaining} more steps</p>
      )}
      {steps.length > 0 && (
        <div className="mt-1 h-1 w-full rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
          <div
            className="h-full bg-blue-500/60 rounded-full transition-all"
            style={{ width: `${(done / steps.length) * 100}%` }}
          />
        </div>
      )}
    </div>
  )
}
