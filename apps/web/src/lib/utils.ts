import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { CSSProperties } from 'react'
import type { NoteColor } from '@notes/shared'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const NOTE_COLOR_CLASSES: Record<NoteColor, string> = {
  DEFAULT: 'bg-note-default',
  RED: 'bg-note-red',
  ORANGE: 'bg-note-orange',
  YELLOW: 'bg-note-yellow',
  GREEN: 'bg-note-green',
  TEAL: 'bg-note-teal',
  BLUE: 'bg-note-blue',
  PURPLE: 'bg-note-purple',
  PINK: 'bg-note-pink',
  BROWN: 'bg-note-brown',
  GRAY: 'bg-note-gray',
}

export const NOTE_COLOR_LABELS: Record<NoteColor, string> = {
  DEFAULT: 'Default',
  RED: 'Red',
  ORANGE: 'Orange',
  YELLOW: 'Yellow',
  GREEN: 'Green',
  TEAL: 'Teal',
  BLUE: 'Blue',
  PURPLE: 'Purple',
  PINK: 'Pink',
  BROWN: 'Brown',
  GRAY: 'Gray',
}

export const NOTE_COLORS_LIST: NoteColor[] = [
  'DEFAULT', 'RED', 'ORANGE', 'YELLOW', 'GREEN',
  'TEAL', 'BLUE', 'PURPLE', 'PINK', 'BROWN', 'GRAY',
]

/** Vivid swatch colors for the color picker — more saturated than note card bg. */
export const NOTE_SWATCH_COLORS: Record<NoteColor, string> = {
  DEFAULT: '#f9fafb',
  RED:     '#f87171',
  ORANGE:  '#fb923c',
  YELLOW:  '#fbbf24',
  GREEN:   '#4ade80',
  TEAL:    '#2dd4bf',
  BLUE:    '#60a5fa',
  PURPLE:  '#c084fc',
  PINK:    '#f472b6',
  BROWN:   '#a87a52',
  GRAY:    '#9ca3af',
}

/** Returns className for predefined colors, or inline style for custom hex colors. */
export function getNoteColorStyle(color: string): { className: string; style?: CSSProperties } {
  if (color.startsWith('#')) {
    return { className: '', style: { backgroundColor: color } }
  }
  return { className: NOTE_COLOR_CLASSES[color as NoteColor] ?? 'bg-note-default' }
}

export function formatReminderDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = date.getTime() - now.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (days === 0) return `Today ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
  if (days === 1) return `Tomorrow ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
  if (days < 7) return date.toLocaleDateString([], { weekday: 'long', hour: '2-digit', minute: '2-digit' })
  return date.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export function daysUntilPurge(trashedAt: string): number {
  const trashedDate = new Date(trashedAt)
  const purgeDate = new Date(trashedDate.getTime() + 30 * 24 * 60 * 60 * 1000)
  return Math.max(0, Math.ceil((purgeDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
}
