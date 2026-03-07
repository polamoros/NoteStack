import { trpc } from '@/api/client'
import { useQueryClient } from '@tanstack/react-query'
import { Bell, Check, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatReminderDate } from '@/lib/utils'

export function RemindersPage() {
  const qc = useQueryClient()
  const { data: reminders = [], isLoading } = trpc.reminders.list.useQuery({})

  const acknowledge = trpc.reminders.acknowledge.useMutation({
    onSuccess: () => qc.invalidateQueries({ queryKey: [['reminders']] }),
  })
  const deleteReminder = trpc.reminders.delete.useMutation({
    onSuccess: () => qc.invalidateQueries({ queryKey: [['reminders']] }),
  })

  const active = reminders.filter((r) => r.nextOccurrence && !r.isAcknowledged)
  const acknowledged = reminders.filter((r) => r.isAcknowledged)

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-xl font-semibold">Reminders</h1>
      <div className="max-w-2xl space-y-6">

      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 rounded-lg border bg-secondary/30 animate-pulse" />
          ))}
        </div>
      )}

      {!isLoading && reminders.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
          <Bell className="h-16 w-16 mb-4 opacity-20" />
          <p className="text-lg font-medium">No reminders</p>
          <p className="text-sm">Add reminders to your notes to see them here</p>
        </div>
      )}

      {active.length > 0 && (
        <section>
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">
            Upcoming
          </h2>
          <div className="space-y-2">
            {active.map((reminder) => (
              <div
                key={reminder.id}
                className="flex items-start justify-between p-4 rounded-lg border bg-card"
              >
                <div>
                  <p className="font-medium">{reminder.note?.title || 'Untitled note'}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatReminderDate(reminder.nextOccurrence!)}
                  </p>
                  {reminder.rrule && (
                    <p className="text-xs text-muted-foreground mt-0.5">Repeating</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => acknowledge.mutate({ id: reminder.id })}
                  >
                    <Check className="h-3.5 w-3.5 mr-1" />
                    Done
                  </Button>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    onClick={() => deleteReminder.mutate({ id: reminder.id })}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {acknowledged.length > 0 && (
        <section>
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">
            Completed
          </h2>
          <div className="space-y-2">
            {acknowledged.map((reminder) => (
              <div
                key={reminder.id}
                className="flex items-start justify-between p-4 rounded-lg border bg-secondary/30 opacity-60"
              >
                <div>
                  <p className="font-medium line-through">{reminder.note?.title || 'Untitled note'}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatReminderDate(reminder.scheduledAt)}
                  </p>
                </div>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  onClick={() => deleteReminder.mutate({ id: reminder.id })}
                >
                  <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              </div>
            ))}
          </div>
        </section>
      )}
      </div>
    </div>
  )
}
