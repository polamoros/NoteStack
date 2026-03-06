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
  icon: string | null
}

export interface NoteSharedWith {
  userId: string
  name: string | null
  image: string | null
  permission: string
}

export interface Note {
  id: string
  createdAt: string
  updatedAt: string
  userId: string
  title: string
  type: NoteType
  color: string
  size: string  // NoteSize named values OR a numeric pixel string e.g. "320"
  status: NoteStatus
  isPinned: boolean
  content: string | null
  sortOrder: string
  trashedAt: string | null
  publicShareToken: string | null
  stackId: string | null
  todoItems: TodoItem[]
  taskSteps: TaskStep[]
  labels: NoteLabel[]
  reminders: NoteReminder[]
  sharedWith: NoteSharedWith[]
}

export interface NoteReminder {
  id: string
  scheduledAt: string
  rrule: string | null
  nextOccurrence: string | null
  isAcknowledged: boolean
}
