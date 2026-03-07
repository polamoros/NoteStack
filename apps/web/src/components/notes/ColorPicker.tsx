import { useState } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Palette } from 'lucide-react'
import { cn, NOTE_COLORS_LIST, NOTE_COLOR_LABELS, NOTE_SWATCH_COLORS } from '@/lib/utils'
import type { NoteColor } from '@notes/shared'

interface ColorPickerProps {
  value: string
  onChange: (color: string) => void
  trigger?: React.ReactNode
  compact?: boolean
}

export function ColorPicker({ value, onChange, trigger, compact }: ColorPickerProps) {
  const isCustom = value.startsWith('#')
  const [customHex, setCustomHex] = useState(isCustom ? value : '#ffffff')

  function handleCustomHexChange(hex: string) {
    setCustomHex(hex)
    onChange(hex)
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        {trigger ?? (
          <button className={`${compact ? 'p-1' : 'p-1.5'} rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors`} title="Change color">
            <Palette className={compact ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
          </button>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-56 p-3" align="start">
        <p className="text-xs text-muted-foreground mb-2 font-medium">Color</p>
        <div className="grid grid-cols-6 gap-1 mb-3">
          {NOTE_COLORS_LIST.map((color) => (
            <button
              key={color}
              title={NOTE_COLOR_LABELS[color]}
              onClick={() => onChange(color)}
              className={cn(
                'h-7 w-7 rounded-full border-2 transition-transform hover:scale-110',
                value === color ? 'border-foreground scale-110' : 'border-transparent',
                color === 'DEFAULT' && 'border-border',
              )}
              style={{ backgroundColor: NOTE_SWATCH_COLORS[color] }}
            />
          ))}
        </div>

        {/* Custom hex picker */}
        <div className="border-t pt-2">
          <p className="text-xs text-muted-foreground mb-1.5 font-medium">Custom</p>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={isCustom ? value : customHex}
              onChange={(e) => handleCustomHexChange(e.target.value)}
              className="h-7 w-7 rounded cursor-pointer border border-border bg-transparent p-0.5"
            />
            <input
              type="text"
              value={isCustom ? value : customHex}
              onChange={(e) => {
                const v = e.target.value
                if (/^#[0-9A-Fa-f]{0,6}$/.test(v)) {
                  setCustomHex(v)
                  if (v.length === 7) onChange(v)
                }
              }}
              placeholder="#000000"
              className="flex-1 text-xs border rounded px-2 py-1 bg-background font-mono"
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
