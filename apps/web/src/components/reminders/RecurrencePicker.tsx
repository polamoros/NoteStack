import { useState } from 'react'

interface RecurrencePickerProps {
  value: string | null
  onChange: (rrule: string | null) => void
}

const PRESETS = [
  { label: 'Does not repeat', value: null },
  { label: 'Daily', value: 'FREQ=DAILY' },
  { label: 'Weekdays (Mon–Fri)', value: 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR' },
  { label: 'Weekly', value: 'FREQ=WEEKLY' },
  { label: 'Monthly', value: 'FREQ=MONTHLY' },
  { label: 'Yearly', value: 'FREQ=YEARLY' },
]

export function RecurrencePicker({ value, onChange }: RecurrencePickerProps) {
  const [custom, setCustom] = useState(false)
  const [interval, setInterval] = useState(1)
  const [freq, setFreq] = useState<'DAILY' | 'WEEKLY' | 'MONTHLY'>('DAILY')

  function buildCustom() {
    return `FREQ=${freq};INTERVAL=${interval}`
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground">Repeat</p>
      <div className="space-y-1">
        {PRESETS.map((preset) => (
          <label key={preset.label} className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="rrule"
              checked={!custom && value === preset.value}
              onChange={() => { setCustom(false); onChange(preset.value) }}
              className="accent-primary"
            />
            <span className="text-sm">{preset.label}</span>
          </label>
        ))}
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name="rrule"
            checked={custom}
            onChange={() => setCustom(true)}
            className="accent-primary"
          />
          <span className="text-sm">Custom…</span>
        </label>
      </div>

      {custom && (
        <div className="flex items-center gap-2 pl-5">
          <span className="text-sm">Every</span>
          <input
            type="number"
            min={1}
            max={99}
            value={interval}
            onChange={(e) => { setInterval(Number(e.target.value)); onChange(buildCustom()) }}
            className="w-14 text-sm border rounded px-2 py-1 bg-background"
          />
          <select
            value={freq}
            onChange={(e) => { setFreq(e.target.value as any); onChange(buildCustom()) }}
            className="text-sm border rounded px-2 py-1 bg-background"
          >
            <option value="DAILY">day(s)</option>
            <option value="WEEKLY">week(s)</option>
            <option value="MONTHLY">month(s)</option>
          </select>
        </div>
      )}
    </div>
  )
}
