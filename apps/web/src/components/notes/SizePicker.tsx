import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Expand } from 'lucide-react'
import { cn } from '@/lib/utils'

const SIZES: { value: string; label: string; rows: number }[] = [
  { value: 'SMALL',  label: 'Small',  rows: 2 },
  { value: 'MEDIUM', label: 'Medium', rows: 4 },
  { value: 'LARGE',  label: 'Large',  rows: 6 },
  { value: 'AUTO',   label: 'Auto',   rows: 3 },
]

function resolveLabel(value: string): string {
  return SIZES.find((s) => s.value === value)?.label ?? 'Custom'
}

interface SizePickerProps {
  value: string
  onChange: (size: string) => void
  compact?: boolean
}

export function SizePicker({ value, onChange, compact }: SizePickerProps) {
  const isCustom = /^\d+x?\d*$/.test(value) && !SIZES.find((s) => s.value === value)

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className={`${compact ? 'p-1' : 'p-1.5'} rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors`}
          title={`Size: ${resolveLabel(value)} — drag corner to resize freely`}
        >
          <Expand className={compact ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-3" align="start">
        <p className="text-xs text-muted-foreground mb-3 font-medium">Preset size</p>
        <div className="flex gap-2">
          {SIZES.map((size) => {
            const active = value === size.value
            return (
              <button
                key={size.value}
                title={size.label}
                onClick={() => onChange(size.value)}
                className={cn(
                  'flex flex-col items-center gap-2 p-2 rounded-xl border-2 transition-all w-16',
                  active
                    ? 'border-primary bg-primary/5'
                    : 'border-transparent hover:border-border bg-muted/40 hover:bg-muted/70',
                )}
              >
                {/* Mini card visual showing proportional height */}
                <div className="w-8 flex flex-col gap-0.5">
                  <div
                    className={cn(
                      'w-full rounded-sm border',
                      active ? 'border-primary/40 bg-primary/10' : 'border-border bg-background',
                    )}
                    style={{ height: `${size.rows * 6}px` }}
                  >
                    {/* Simulated content lines */}
                    <div className="p-1 space-y-0.5">
                      {Array.from({ length: Math.min(size.rows - 1, 4) }).map((_, i) => (
                        <div
                          key={i}
                          className={cn(
                            'h-px rounded-full',
                            active ? 'bg-primary/30' : 'bg-muted-foreground/20',
                            i === 0 ? 'w-full' : i % 2 === 0 ? 'w-3/4' : 'w-1/2',
                          )}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                <span className={cn(
                  'text-[11px] font-medium',
                  active ? 'text-primary' : 'text-muted-foreground',
                )}>
                  {size.label}
                </span>
              </button>
            )
          })}
        </div>
        {isCustom && (
          <p className="mt-3 pt-2 border-t text-[10px] text-muted-foreground/70">
            Custom: {value} — drag the corner to resize
          </p>
        )}
      </PopoverContent>
    </Popover>
  )
}
