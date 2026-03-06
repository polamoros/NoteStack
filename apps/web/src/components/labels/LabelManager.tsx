import { useState, useRef, useMemo } from 'react'
import * as LucideIcons from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { trpc } from '@/api/client'
import { useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2, Check, X, Pipette } from 'lucide-react'
import type { LucideProps } from 'lucide-react'
import { LabelIcon } from './LabelIcon'

// ── Predefined label colours (hex) ────────────────────────────────────────────
const LABEL_COLORS = [
  null,       // "no colour"
  '#ef4444',  '#f97316',  '#eab308',  '#22c55e',
  '#06b6d4',  '#3b82f6',  '#8b5cf6',  '#ec4899',
  '#6b7280',  '#92400e',  '#0f172a',
]

// ── Curated icon list with searchable labels ──────────────────────────────────
const ICON_LIST = [
  // Essentials
  { name: 'Star',         label: 'star favorite important' },
  { name: 'Heart',        label: 'heart love favorite' },
  { name: 'Bookmark',     label: 'bookmark save reading' },
  { name: 'Flag',         label: 'flag mark warning' },
  { name: 'Pin',          label: 'pin attach mark location' },
  { name: 'Tag',          label: 'tag label' },
  { name: 'Hash',         label: 'hash number topic channel' },
  // Work & Productivity
  { name: 'Briefcase',    label: 'briefcase work job' },
  { name: 'Target',       label: 'target goal aim focus' },
  { name: 'Calendar',     label: 'calendar date schedule plan event' },
  { name: 'Clock',        label: 'clock time hour reminder' },
  { name: 'CheckSquare',  label: 'check todo task done complete' },
  { name: 'List',         label: 'list items tasks todo' },
  { name: 'Inbox',        label: 'inbox email receive' },
  { name: 'Mail',         label: 'mail email message' },
  { name: 'Folder',       label: 'folder file organize' },
  { name: 'File',         label: 'file document' },
  { name: 'FileText',     label: 'file text document note' },
  { name: 'Layers',       label: 'layers stack group' },
  // Learning
  { name: 'Book',         label: 'book reading study learn' },
  { name: 'BookOpen',     label: 'book open reading' },
  { name: 'Lightbulb',   label: 'lightbulb idea creative think' },
  { name: 'Pencil',       label: 'pencil write edit' },
  { name: 'PenTool',      label: 'pen tool draw design' },
  // Tech
  { name: 'Laptop',       label: 'laptop computer device' },
  { name: 'Monitor',      label: 'monitor desktop screen' },
  { name: 'Phone',        label: 'phone mobile call' },
  { name: 'Code',         label: 'code programming dev software' },
  { name: 'Terminal',     label: 'terminal console command' },
  { name: 'Settings',     label: 'settings gear config' },
  { name: 'Wrench',       label: 'wrench tool repair fix' },
  // Communication
  { name: 'Bell',         label: 'bell notification reminder alert' },
  { name: 'Mic',          label: 'mic microphone audio record voice' },
  { name: 'Headphones',   label: 'headphones audio listen music' },
  // Media & Creative
  { name: 'Camera',       label: 'camera photo picture' },
  { name: 'Image',        label: 'image photo picture media' },
  { name: 'Music',        label: 'music audio note song' },
  { name: 'Film',         label: 'film movie video' },
  { name: 'Palette',      label: 'palette art creative color paint' },
  // Finance & Shopping
  { name: 'DollarSign',   label: 'dollar money finance budget' },
  { name: 'ShoppingCart', label: 'shopping cart buy purchase' },
  { name: 'ShoppingBag',  label: 'shopping bag buy' },
  { name: 'CreditCard',   label: 'credit card payment' },
  { name: 'Package',      label: 'package box product' },
  { name: 'Truck',        label: 'truck delivery shipping' },
  { name: 'Gift',         label: 'gift present birthday' },
  // People
  { name: 'User',         label: 'user person profile' },
  { name: 'Users',        label: 'users people team group' },
  { name: 'Smile',        label: 'smile happy face' },
  // Nature & Weather
  { name: 'Leaf',         label: 'leaf nature plant green' },
  { name: 'Flame',        label: 'flame fire hot' },
  { name: 'Sun',          label: 'sun light bright day summer' },
  { name: 'Moon',         label: 'moon night dark' },
  { name: 'Cloud',        label: 'cloud sky weather' },
  { name: 'Snowflake',    label: 'snowflake cold winter ice' },
  { name: 'Umbrella',     label: 'umbrella rain weather' },
  { name: 'Mountain',     label: 'mountain outdoor hiking' },
  // Travel
  { name: 'Globe',        label: 'globe world earth travel international' },
  { name: 'Map',          label: 'map travel navigate location' },
  { name: 'Compass',      label: 'compass navigate direction' },
  { name: 'Plane',        label: 'plane airplane travel flight' },
  { name: 'Car',          label: 'car vehicle drive' },
  // Food & Lifestyle
  { name: 'Coffee',       label: 'coffee drink hot cafe morning' },
  // Achievements
  { name: 'Trophy',       label: 'trophy win achievement' },
  { name: 'Award',        label: 'award badge prize' },
  { name: 'Sparkles',     label: 'sparkles magic special' },
  { name: 'Zap',          label: 'zap lightning energy bolt fast' },
  { name: 'Rocket',       label: 'rocket launch space startup fast' },
  // Security
  { name: 'Lock',         label: 'lock secure private' },
  { name: 'Key',          label: 'key access unlock' },
  { name: 'Shield',       label: 'shield security protect safe' },
  // Analytics
  { name: 'BarChart',     label: 'bar chart graph analytics data' },
  { name: 'TrendingUp',   label: 'trending up growth increase' },
  { name: 'Activity',     label: 'activity health fitness stats' },
  // Misc
  { name: 'Link',         label: 'link url web' },
  { name: 'Paperclip',    label: 'paperclip attach clip' },
  { name: 'Home',         label: 'home house' },
]

// ── Colour picker ────────────────────────────────────────────────────────────
interface ColorPickerProps {
  value: string | null
  onChange: (color: string | null) => void
}

function ColorPicker({ value, onChange }: ColorPickerProps) {
  const customInputRef = useRef<HTMLInputElement>(null)
  const isCustom = value !== null && !LABEL_COLORS.includes(value)

  return (
    <div className="flex flex-wrap gap-1.5 items-center">
      {LABEL_COLORS.map((color, i) => (
        <button
          key={i}
          onClick={() => onChange(color)}
          title={color ?? 'No colour'}
          className="h-5 w-5 rounded-full border border-border/60 flex items-center justify-center transition-transform hover:scale-110"
          style={{ background: color ?? 'transparent' }}
        >
          {value === color && (
            <Check className="h-3 w-3" style={{ color: color ? '#fff' : 'currentColor' }} />
          )}
        </button>
      ))}
      {/* Custom colour via native colour picker */}
      <div className="relative" title="Custom colour">
        <button
          onClick={() => customInputRef.current?.click()}
          className="h-5 w-5 rounded-full border-2 border-dashed border-muted-foreground/40 flex items-center justify-center hover:border-primary transition-colors overflow-hidden"
          style={{ background: isCustom ? (value ?? 'transparent') : 'transparent' }}
        >
          {isCustom
            ? <Check className="h-3 w-3 text-white drop-shadow" />
            : <Pipette className="h-2.5 w-2.5 text-muted-foreground" />
          }
        </button>
        <input
          ref={customInputRef}
          type="color"
          value={isCustom ? (value ?? '#3b82f6') : '#3b82f6'}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 opacity-0 w-0 h-0 pointer-events-none"
          tabIndex={-1}
        />
      </div>
    </div>
  )
}

// ── Icon picker (Lucide icons with search) ────────────────────────────────────
interface IconPickerProps {
  value: string | null
  onChange: (icon: string | null) => void
}

function IconPicker({ value, onChange }: IconPickerProps) {
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    if (!q) return ICON_LIST
    return ICON_LIST.filter(
      (i) => i.name.toLowerCase().includes(q) || i.label.includes(q),
    )
  }, [search])

  return (
    <div className="space-y-2">
      <Input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search icons…"
        className="h-7 text-xs"
      />
      <div className="grid grid-cols-8 gap-0.5 max-h-40 overflow-y-auto pr-0.5">
        {/* "No icon" option */}
        <button
          onClick={() => onChange(null)}
          title="No icon"
          className={`h-8 w-8 rounded flex items-center justify-center text-muted-foreground hover:bg-accent transition-colors ${value === null ? 'border border-primary bg-accent' : ''}`}
        >
          <X className="h-3.5 w-3.5" />
        </button>
        {filtered.map(({ name }) => {
          const IconComp = (LucideIcons as unknown as Record<string, React.ComponentType<LucideProps>>)[name]
          if (!IconComp) return null
          return (
            <button
              key={name}
              onClick={() => onChange(name)}
              title={name}
              className={`h-8 w-8 rounded flex items-center justify-center hover:bg-accent transition-colors ${value === name ? 'border border-primary bg-accent' : ''}`}
            >
              <IconComp className="h-4 w-4" />
            </button>
          )
        })}
        {filtered.length === 0 && (
          <p className="col-span-8 text-xs text-muted-foreground text-center py-3">No icons found</p>
        )}
      </div>
    </div>
  )
}

// ── Inline edit form ────────────────────────────────────────────────────────
interface EditFormProps {
  initialName: string
  initialColor: string | null
  initialIcon: string | null
  onSave: (name: string, color: string | null, icon: string | null) => void
  onCancel: () => void
  saving?: boolean
}

function EditForm({ initialName, initialColor, initialIcon, onSave, onCancel, saving }: EditFormProps) {
  const [name, setName] = useState(initialName)
  const [color, setColor] = useState<string | null>(initialColor)
  const [icon, setIcon] = useState<string | null>(initialIcon)
  const [showIconPicker, setShowIconPicker] = useState(false)

  return (
    <div className="space-y-2 rounded-lg border p-3 bg-accent/30">
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onSave(name.trim(), color, icon)
          if (e.key === 'Escape') onCancel()
        }}
        className="h-8 text-sm"
        placeholder="Label name"
        autoFocus
      />
      <div className="space-y-1">
        <p className="text-xs text-muted-foreground font-medium">Colour</p>
        <ColorPicker value={color} onChange={setColor} />
      </div>
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground font-medium">Icon</p>
          <button
            onClick={() => setShowIconPicker((v) => !v)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground px-1.5 py-0.5 rounded hover:bg-accent transition-colors"
          >
            {icon
              ? <LabelIcon icon={icon} color={color} size={13} />
              : <span className="text-xs opacity-50">none</span>}
            <span className="ml-1">{showIconPicker ? 'Hide' : 'Pick'}</span>
          </button>
        </div>
        {showIconPicker && (
          <IconPicker value={icon} onChange={(v) => { setIcon(v); setShowIconPicker(false) }} />
        )}
      </div>
      <div className="flex gap-2">
        <Button
          size="sm"
          className="flex-1"
          onClick={() => onSave(name.trim(), color, icon)}
          disabled={!name.trim() || saving}
        >
          <Check className="h-3.5 w-3.5 mr-1" />
          Save
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  )
}

// ── Main component ──────────────────────────────────────────────────────────
interface LabelManagerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function LabelManager({ open, onOpenChange }: LabelManagerProps) {
  const qc = useQueryClient()
  const { data: labels = [] } = trpc.labels.list.useQuery()
  const [creatingNew, setCreatingNew] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  function invalidate() {
    qc.invalidateQueries({ queryKey: [['labels']] })
    qc.invalidateQueries({ queryKey: [['notes']] })
  }

  const createLabel = trpc.labels.create.useMutation({ onSuccess: () => { invalidate(); setCreatingNew(false) } })
  const updateLabel = trpc.labels.update.useMutation({ onSuccess: () => { invalidate(); setEditingId(null) } })
  const deleteLabel = trpc.labels.delete.useMutation({ onSuccess: invalidate })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Manage Labels</DialogTitle>
        </DialogHeader>

        {/* New label */}
        {creatingNew ? (
          <EditForm
            initialName=""
            initialColor={null}
            initialIcon={null}
            saving={createLabel.isPending}
            onSave={(name, color, icon) => {
              if (!name) return
              createLabel.mutate({ name, color: color ?? undefined, icon: icon ?? undefined })
            }}
            onCancel={() => setCreatingNew(false)}
          />
        ) : (
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setCreatingNew(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            New label
          </Button>
        )}

        {/* Label list */}
        <div className="space-y-1 max-h-80 overflow-y-auto">
          {labels.length === 0 && !creatingNew && (
            <p className="text-sm text-muted-foreground text-center py-4">No labels yet</p>
          )}
          {labels.map((label) => (
            <div key={label.id}>
              {editingId === label.id ? (
                <EditForm
                  initialName={label.name}
                  initialColor={label.color}
                  initialIcon={label.icon}
                  saving={updateLabel.isPending}
                  onSave={(name, color, icon) => {
                    if (!name) return
                    updateLabel.mutate({ id: label.id, name, color: color ?? null, icon: icon ?? null })
                  }}
                  onCancel={() => setEditingId(null)}
                />
              ) : (
                <div className="flex items-center gap-2 group px-1 py-1 rounded hover:bg-accent/30">
                  <LabelIcon icon={label.icon} color={label.color} size={15} />
                  <span
                    className="flex-1 text-sm truncate"
                    style={label.color ? { color: label.color } : undefined}
                  >
                    {label.name}
                  </span>
                  <button
                    onClick={() => setEditingId(label.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground p-1"
                    title="Edit"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => deleteLabel.mutate({ id: label.id })}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive p-1"
                    title="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
