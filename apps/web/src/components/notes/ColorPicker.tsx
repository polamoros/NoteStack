import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Palette } from 'lucide-react'
import { cn, NOTE_COLORS_LIST, NOTE_COLOR_CLASSES, NOTE_COLOR_LABELS } from '@/lib/utils'
import type { NoteColor } from '@notes/shared'

interface ColorPickerProps {
  value: NoteColor
  onChange: (color: NoteColor) => void
  trigger?: React.ReactNode
}

export function ColorPicker({ value, onChange, trigger }: ColorPickerProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        {trigger ?? (
          <button className="p-1.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors" title="Change color">
            <Palette className="h-4 w-4" />
          </button>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-3" align="start">
        <p className="text-xs text-muted-foreground mb-2 font-medium">Color</p>
        <div className="grid grid-cols-6 gap-1">
          {NOTE_COLORS_LIST.map((color) => (
            <button
              key={color}
              title={NOTE_COLOR_LABELS[color]}
              onClick={() => onChange(color)}
              className={cn(
                'h-7 w-7 rounded-full border-2 transition-transform hover:scale-110',
                NOTE_COLOR_CLASSES[color],
                value === color ? 'border-foreground scale-110' : 'border-transparent',
                color === 'DEFAULT' && 'border border-border',
              )}
            />
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}
