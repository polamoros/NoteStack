import { useState } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Bell, BellOff, CalendarClock, Sunset, CalendarDays } from 'lucide-react'
import { trpc } from '@/api/client'
import { useQueryClient } from '@tanstack/react-query'
import { RecurrencePicker } from './RecurrencePicker'
import type { NoteReminder } from '@notes/shared'
import { formatReminderDate } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface ReminderPickerProps {
  noteId: string
  reminders: NoteReminder[]
  compact?: boolean
}

/** ISO date string for N days from now */
function dateIn(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

interface QuickPreset {
  label: string
  icon: React.ReactNode
  date: string
  time: string
}

const QUICK_PRESETS: QuickPreset[] = [
  { label: 'Today',     icon: <Bell      className="h-3.5 w-3.5" />, date: dateIn(0), time: '18:00' },
  { label: 'Tomorrow',  icon: <Sunset    className="h-3.5 w-3.5" />, date: dateIn(1), time: '09:00' },
  { label: 'Next week', icon: <CalendarDays className="h-3.5 w-3.5" />, date: dateIn(7), time: '09:00' },
]

export function ReminderPicker({ noteId, reminders, compact }: ReminderPickerProps) {
  const qc = useQueryClient()
  const [date, setDate] = useState('')
  const [time, setTime] = useState('09:00')
  const [rrule, setRrule] = useState<string | null>(null)
  const [open, setOpen] = useState(false)

  function invalidate() {
    qc.invalidateQueries({ queryKey: [['notes']] })
    qc.invalidateQueries({ queryKey: [['reminders']] })
  }

  const createReminder = trpc.reminders.create.useMutation({
    onSuccess: () => { invalidate(); setOpen(false) },
  })
  const deleteReminder = trpc.reminders.delete.useMutation({ onSuccess: invalidate })

  const activeReminder = reminders.find((r) => r.nextOccurrence && !r.isAcknowledged)

  function applyPreset(preset: QuickPreset) {
    setDate(preset.date)
    setTime(preset.time)
  }

  function handleSave() {
    if (!date) return
    const scheduledAt = new Date(`${date}T${time}:00`).toISOString()
    createReminder.mutate({ noteId, scheduledAt, rrule: rrule ?? undefined })
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={`${compact ? 'p-1' : 'p-1.5'} rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors relative`}
          title={activeReminder ? `Reminder: ${formatReminderDate(activeReminder.nextOccurrence!)}` : 'Add reminder'}
        >
          <Bell className={`${compact ? 'h-3.5 w-3.5' : 'h-4 w-4'} ${activeReminder ? 'fill-current' : ''}`} />
          {activeReminder && (
            <span className="absolute top-0 right-0 h-2 w-2 rounded-full bg-yellow-400 ring-1 ring-background" />
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0 overflow-hidden" align="start">
        {/* ── Active reminders ──────────────────────────────────────────── */}
        {reminders.filter((r) => r.nextOccurrence).length > 0 && (
          <div className="p-3 border-b space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Active</p>
            {reminders.filter((r) => r.nextOccurrence).map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between gap-2 text-sm bg-accent/50 rounded-lg px-3 py-2"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <CalendarClock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <p className="font-medium text-xs truncate">{formatReminderDate(r.nextOccurrence!)}</p>
                    {r.rrule && <p className="text-[10px] text-muted-foreground">Repeating</p>}
                  </div>
                </div>
                <button
                  onClick={() => deleteReminder.mutate({ id: r.id })}
                  className="text-muted-foreground hover:text-destructive shrink-0 p-0.5 rounded"
                  title="Remove reminder"
                >
                  <BellOff className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* ── Quick presets ─────────────────────────────────────────────── */}
        <div className="p-3 border-b">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Quick add</p>
          <div className="grid grid-cols-3 gap-1.5">
            {QUICK_PRESETS.map((preset) => (
              <button
                key={preset.label}
                onClick={() => applyPreset(preset)}
                className={cn(
                  'flex flex-col items-center gap-1 px-2 py-2 rounded-lg text-xs border transition-colors',
                  date === preset.date
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border hover:bg-accent hover:border-accent-foreground/20 text-muted-foreground hover:text-foreground',
                )}
              >
                {preset.icon}
                <span>{preset.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ── Custom date + time ────────────────────────────────────────── */}
        <div className="p-3 border-b space-y-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Custom</p>
          <div className="flex gap-2">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className={cn(
                'flex-1 text-sm rounded-lg px-2.5 py-1.5 bg-background',
                'border border-input ring-offset-background',
                'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1',
                'transition-colors',
              )}
            />
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className={cn(
                'w-[5.5rem] text-sm rounded-lg px-2.5 py-1.5 bg-background',
                'border border-input ring-offset-background',
                'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1',
                'transition-colors',
              )}
            />
          </div>

          {/* Recurrence */}
          <RecurrencePicker value={rrule} onChange={setRrule} />
        </div>

        {/* ── Save button ───────────────────────────────────────────────── */}
        <div className="p-3">
          <Button
            onClick={handleSave}
            disabled={!date || createReminder.isPending}
            className="w-full"
            size="sm"
          >
            Set reminder
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
