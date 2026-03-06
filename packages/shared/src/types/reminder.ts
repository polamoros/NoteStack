export interface Reminder {
  id: string
  noteId: string
  scheduledAt: string
  rrule: string | null
  nextOccurrence: string | null
  isAcknowledged: boolean
  firedAt: string | null
  createdAt: string
  updatedAt: string
  note?: {
    id: string
    title: string
  }
}

export interface ReminderSSEEvent {
  type: 'reminder'
  reminderId: string
  noteId: string
  noteTitle: string
  scheduledAt: string
}
