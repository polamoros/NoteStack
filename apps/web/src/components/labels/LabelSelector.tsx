import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Tag, Check } from 'lucide-react'
import { trpc } from '@/api/client'
import { useQueryClient } from '@tanstack/react-query'
import type { NoteLabel } from '@notes/shared'
import { cn } from '@/lib/utils'

interface LabelSelectorProps {
  noteId: string
  attachedLabels: NoteLabel[]
}

export function LabelSelector({ noteId, attachedLabels }: LabelSelectorProps) {
  const qc = useQueryClient()
  const { data: allLabels = [] } = trpc.labels.list.useQuery()

  function invalidate() {
    qc.invalidateQueries({ queryKey: [['notes']] })
  }

  const attach = trpc.labels.attach.useMutation({ onSuccess: invalidate })
  const detach = trpc.labels.detach.useMutation({ onSuccess: invalidate })

  const attachedIds = new Set(attachedLabels.map((l) => l.id))

  function toggle(labelId: string) {
    if (attachedIds.has(labelId)) {
      detach.mutate({ noteId, labelId })
    } else {
      attach.mutate({ noteId, labelId })
    }
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className="p-1.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
          title="Labels"
        >
          <Tag className="h-4 w-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-2" align="start">
        <p className="text-xs font-medium text-muted-foreground px-2 py-1">Labels</p>
        {allLabels.length === 0 && (
          <p className="text-xs text-muted-foreground px-2 py-2">No labels yet</p>
        )}
        {allLabels.map((label) => {
          const attached = attachedIds.has(label.id)
          return (
            <button
              key={label.id}
              onClick={() => toggle(label.id)}
              className="flex items-center gap-2 w-full px-2 py-1.5 rounded text-sm hover:bg-accent transition-colors"
            >
              <div className={cn('h-4 w-4 rounded-sm border flex items-center justify-center',
                attached ? 'bg-primary border-primary' : 'border-muted-foreground/40',
              )}>
                {attached && <Check className="h-3 w-3 text-primary-foreground" />}
              </div>
              <span className="truncate">{label.name}</span>
            </button>
          )
        })}
      </PopoverContent>
    </Popover>
  )
}
