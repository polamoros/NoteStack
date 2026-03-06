export type NoteType = 'RICH' | 'TODO' | 'TASK'
export type NoteSize = 'SMALL' | 'MEDIUM' | 'LARGE' | 'AUTO'
export type NoteStatus = 'ACTIVE' | 'ARCHIVED' | 'TRASHED'

export type NoteColor =
  | 'DEFAULT'
  | 'RED'
  | 'ORANGE'
  | 'YELLOW'
  | 'GREEN'
  | 'TEAL'
  | 'BLUE'
  | 'PURPLE'
  | 'PINK'
  | 'BROWN'
  | 'GRAY'

export interface TodoItem {
  id: string
  noteId: string
  text: string
  isChecked: boolean
  sortOrder: string
  createdAt: string
}

export interface TaskStep {
  id: string
  noteId: string
  title: string
  description: string | null
  isComplete: boolean
  sortOrder: string
  createdAt: string
}

export interface NoteLabel {
  id: string
  name: string
  color: string | null
}

export interface Note {
  id: string
  createdAt: string
  updatedAt: string
  userId: string
  title: string
  type: NoteType
  color: NoteColor
  size: NoteSize
  status: NoteStatus
  isPinned: boolean
  content: string | null
  sortOrder: string
  trashedAt: string | null
  todoItems: TodoItem[]
  taskSteps: TaskStep[]
  labels: NoteLabel[]
  reminders: NoteReminder[]
}

export interface NoteReminder {
  id: string
  scheduledAt: string
  rrule: string | null
  nextOccurrence: string | null
  isAcknowledged: boolean
}
