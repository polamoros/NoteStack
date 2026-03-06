import { useState } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Bell, BellOff } from 'lucide-react'
import { trpc } from '@/api/client'
import { useQueryClient } from '@tanstack/react-query'
import { RecurrencePicker } from './RecurrencePicker'
import type { NoteReminder } from '@notes/shared'
import { formatReminderDate } from '@/lib/utils'

interface ReminderPickerProps {
  noteId: string
  reminders: NoteReminder[]
}

export function ReminderPicker({ noteId, reminders }: ReminderPickerProps) {
  const qc = useQueryClient()
  const [date, setDate] = useState('')
  const [time, setTime] = useState('09:00')
  const [rrule, setRrule] = useState<string | null>(null)
  const [open, setOpen] = useState(false)

  function invalidate() {
    qc.invalidateQueries({ queryKey: [['notes']] })
    qc.invalidateQueries({ queryKey: [['reminders']] })
  }

  const createReminder = trpc.reminders.create.useMutation({ onSuccess: () => { invalidate(); setOpen(false) } })
  const deleteReminder = trpc.reminders.delete.useMutation({ onSuccess: invalidate })

  const activeReminder = reminders.find((r) => r.nextOccurrence && !r.isAcknowledged)

  function handleSave() {
    if (!date) return
    const scheduledAt = new Date(`${date}T${time}:00`).toISOString()
    createReminder.mutate({ noteId, scheduledAt, rrule: rrule ?? undefined })
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="p-1.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors relative"
          title={activeReminder ? `Reminder: ${formatReminderDate(activeReminder.nextOccurrence!)}` : 'Add reminder'}
        >
          <Bell className={`h-4 w-4 ${activeReminder ? 'fill-current' : ''}`} />
          {activeReminder && (
            <span className="absolute top-0 right-0 h-2 w-2 rounded-full bg-yellow-400" />
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-4 space-y-4" align="start">
        {/* Active reminders */}
        {reminders.filter((r) => r.nextOccurrence).map((r) => (
          <div key={r.id} className="flex items-center justify-between text-sm bg-secondary/50 rounded-md px-2 py-1.5">
            <div>
              <p className="font-medium">{formatReminderDate(r.nextOccurrence!)}</p>
              {r.rrule && <p className="text-xs text-muted-foreground">Repeating</p>}
            </div>
            <button
              onClick={() => deleteReminder.mutate({ id: r.id })}
              className="text-muted-foreground hover:text-destructive"
            >
              <BellOff className="h-4 w-4" />
            </button>
          </div>
        ))}

        {/* Date + time picker */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Add reminder</p>
          <div className="flex gap-2">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="flex-1 text-sm border rounded px-2 py-1.5 bg-background"
            />
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-24 text-sm border rounded px-2 py-1.5 bg-background"
            />
          </div>
        </div>

        {/* Recurrence */}
        <RecurrencePicker value={rrule} onChange={setRrule} />

        <Button onClick={handleSave} disabled={!date} className="w-full" size="sm">
          Save reminder
        </Button>
      </PopoverContent>
    </Popover>
  )
}
