import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Expand } from 'lucide-react'
import { cn } from '@/lib/utils'

const SIZES: { value: string; label: string; icon: string }[] = [
  { value: 'SMALL', label: 'Small', icon: '▪' },
  { value: 'MEDIUM', label: 'Medium', icon: '▫' },
  { value: 'LARGE', label: 'Large', icon: '□' },
  { value: 'AUTO', label: 'Auto', icon: '⊡' },
]

// Named sizes — custom px values show as "Custom"
function resolveLabel(value: string): string {
  return SIZES.find((s) => s.value === value)?.label ?? 'Custom'
}

interface SizePickerProps {
  value: string
  onChange: (size: string) => void
  compact?: boolean
}

export function SizePicker({ value, onChange, compact }: SizePickerProps) {
  const isCustom = /^\d+$/.test(value)

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className={`${compact ? 'p-1' : 'p-1.5'} rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors`}
          title={`Size: ${resolveLabel(value)} (drag bottom-right corner to resize freely)`}
        >
          <Expand className={compact ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-3" align="start">
        <p className="text-xs text-muted-foreground mb-2 font-medium">Preset size</p>
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
        {isCustom && (
          <p className="mt-2 text-[10px] text-muted-foreground/70">
            Custom: {value}px — drag the corner to change
          </p>
        )}
      </PopoverContent>
    </Popover>
  )
}
