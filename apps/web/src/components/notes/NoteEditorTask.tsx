import { useState } from 'react'
import { trpc } from '@/api/client'
import { useQueryClient } from '@tanstack/react-query'
import type { Note } from '@notes/shared'
import { cn } from '@/lib/utils'
import { Plus, X, ChevronDown } from 'lucide-react'

interface NoteEditorTaskProps {
  noteId: string
  steps: Note['taskSteps']
}

export function NoteEditorTask({ noteId, steps }: NoteEditorTaskProps) {
  const qc = useQueryClient()
  const [newTitle, setNewTitle] = useState('')

  function invalidate() {
    qc.invalidateQueries({ queryKey: [['notes']] })
  }

  const createStep = trpc.taskSteps.create.useMutation({ onSuccess: invalidate })
  const updateStep = trpc.taskSteps.update.useMutation({ onSuccess: invalidate })
  const deleteStep = trpc.taskSteps.delete.useMutation({ onSuccess: invalidate })

  function handleAdd() {
    if (!newTitle.trim()) return
    createStep.mutate({ noteId, title: newTitle.trim() })
    setNewTitle('')
  }

  const done = steps.filter((s) => s.isComplete).length

  return (
    <div className="space-y-1">
      {/* Progress */}
      {steps.length > 0 && (
        <div className="flex items-center gap-2 mb-3">
          <div className="flex-1 h-1.5 rounded-full bg-secondary overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all"
              style={{ width: `${(done / steps.length) * 100}%` }}
            />
          </div>
          <span className="text-xs text-muted-foreground shrink-0">
            {done}/{steps.length}
          </span>
        </div>
      )}

      {/* Step list */}
      {steps.map((step) => (
        <TaskStepRow
          key={step.id}
          step={step}
          onToggle={(complete) => updateStep.mutate({ id: step.id, isComplete: complete })}
          onTitleChange={(title) => updateStep.mutate({ id: step.id, title })}
          onDescChange={(description) => updateStep.mutate({ id: step.id, description })}
          onDelete={() => deleteStep.mutate({ id: step.id })}
        />
      ))}

      {/* Add step — same padding as TaskStepRow so Plus aligns with checkboxes */}
      <div className="flex items-center gap-2 p-1 mt-1 rounded-md">
        <Plus className="h-5 w-5 shrink-0 text-muted-foreground/50 mt-0.5" />
        <input
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          placeholder="Add step"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAdd() } }}
          onBlur={handleAdd}
        />
      </div>
    </div>
  )
}

function TaskStepRow({
  step,
  onToggle,
  onTitleChange,
  onDescChange,
  onDelete,
}: {
  step: Note['taskSteps'][0]
  onToggle: (complete: boolean) => void
  onTitleChange: (title: string) => void
  onDescChange: (desc: string) => void
  onDelete: () => void
}) {
  const [title, setTitle] = useState(step.title)
  const [desc, setDesc] = useState(step.description ?? '')
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="group/step rounded-md border border-transparent hover:border-border transition-colors p-1">
      <div className="flex items-start gap-2">
        <button
          className={cn(
            'mt-0.5 h-5 w-5 shrink-0 rounded-full border-2 transition-colors flex items-center justify-center',
            step.isComplete
              ? 'bg-blue-500 border-blue-500 text-white'
              : 'border-muted-foreground/40 hover:border-blue-500',
          )}
          onClick={() => onToggle(!step.isComplete)}
        >
          {step.isComplete && <span className="text-xs leading-none">✓</span>}
        </button>
        <div className="flex-1 min-w-0">
          <input
            className={cn(
              'w-full bg-transparent text-sm font-medium outline-none',
              step.isComplete && 'line-through text-muted-foreground',
            )}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => { if (title !== step.title) onTitleChange(title) }}
            onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }}
          />
        </div>
        <div className="flex items-center shrink-0 opacity-0 group-hover/step:opacity-100 transition-opacity">
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1 text-muted-foreground hover:text-foreground rounded"
          >
            <ChevronDown className={cn('h-4 w-4 transition-transform', expanded && 'rotate-180')} />
          </button>
          <button
            onClick={onDelete}
            className="p-1 text-muted-foreground hover:text-destructive rounded"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
      {expanded && (
        <div className="pl-7 mt-1">
          <textarea
            className="w-full bg-transparent text-sm text-muted-foreground outline-none resize-none placeholder:text-muted-foreground/60"
            placeholder="Add description…"
            rows={2}
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            onBlur={() => { if (desc !== (step.description ?? '')) onDescChange(desc) }}
          />
        </div>
      )}
    </div>
  )
}
