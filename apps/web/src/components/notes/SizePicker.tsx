import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Expand } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { NoteSize } from '@notes/shared'

const SIZES: { value: NoteSize; label: string; icon: string }[] = [
  { value: 'SMALL', label: 'Small', icon: '▪' },
  { value: 'MEDIUM', label: 'Medium', icon: '▫' },
  { value: 'LARGE', label: 'Large', icon: '□' },
  { value: 'AUTO', label: 'Auto', icon: '⊡' },
]

interface SizePickerProps {
  value: NoteSize
  onChange: (size: NoteSize) => void
}

export function SizePicker({ value, onChange }: SizePickerProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="p-1.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors" title="Change size">
          <Expand className="h-4 w-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-3" align="start">
        <p className="text-xs text-muted-foreground mb-2 font-medium">Size</p>
        <div className="flex gap-1">
          {SIZES.map((size) => (
            <button
              key={size.value}
              title={size.label}
              onClick={() => onChange(size.value)}
              className={cn(
                'flex flex-col items-center gap-1 px-3 py-2 rounded-md text-xs transition-colors',
                value === size.value
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-accent text-muted-foreground',
              )}
            >
              <span className="text-lg leading-none">{size.icon}</span>
              <span>{size.label}</span>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}
