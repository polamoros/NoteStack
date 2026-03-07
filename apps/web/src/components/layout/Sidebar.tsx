import { NavLink, useNavigate } from 'react-router-dom'
import {
  Archive, Trash2, Bell, Tag, Settings, LogOut, ChevronRight,
  Layers, Plus, Pencil, Trash2 as TrashIcon, Check, X, User,
  Inbox,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { trpc } from '@/api/client'
import { useQueryClient } from '@tanstack/react-query'
import { authClient } from '@/lib/auth-client'
import { useUIStore } from '@/store/ui.store'
import { Separator } from '@/components/ui/separator'
import { LabelManager } from '@/components/labels/LabelManager'
import { LabelIcon } from '@/components/labels/LabelIcon'
import { useState, useEffect } from 'react'
import * as LucideIcons from 'lucide-react'
import type { LucideProps } from 'lucide-react'
import type { Stack } from '@notes/shared'

interface NavItemProps {
  to: string
  icon: React.ReactNode
  label: string
  end?: boolean
  onClick?: () => void
}

function NavItem({ to, icon, label, end, onClick }: NavItemProps) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onClick}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
          isActive
            ? 'bg-accent text-accent-foreground font-medium'
            : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
        )
      }
    >
      {icon}
      <span>{label}</span>
    </NavLink>
  )
}

// ── Stack icon helpers ───────────────────────────────────────────────────────
const STACK_ICON_HINTS: Array<{ iconName: string; keywords: string[] }> = [
  { iconName: 'Briefcase',    keywords: ['work', 'job', 'business', 'office', 'career', 'company', 'client', 'clients'] },
  { iconName: 'Code',         keywords: ['code', 'coding', 'dev', 'developer', 'programming', 'tech', 'software', 'frontend', 'backend'] },
  { iconName: 'Home',         keywords: ['home', 'house', 'personal', 'private', 'household'] },
  { iconName: 'Book',         keywords: ['book', 'books', 'reading', 'study', 'learn', 'learning', 'education', 'school', 'course'] },
  { iconName: 'BookOpen',     keywords: ['notes', 'journal', 'diary', 'wiki', 'docs', 'documentation', 'research'] },
  { iconName: 'DollarSign',   keywords: ['money', 'finance', 'budget', 'expense', 'expenses', 'financial', 'bank', 'savings'] },
  { iconName: 'Plane',        keywords: ['travel', 'trip', 'vacation', 'flight', 'holiday', 'adventure', 'abroad'] },
  { iconName: 'Activity',     keywords: ['health', 'fitness', 'gym', 'workout', 'sport', 'exercise', 'training', 'running'] },
  { iconName: 'Music',        keywords: ['music', 'audio', 'song', 'songs', 'playlist', 'band', 'album'] },
  { iconName: 'Camera',       keywords: ['photo', 'photography', 'pictures', 'photos'] },
  { iconName: 'Lightbulb',    keywords: ['idea', 'ideas', 'inspiration', 'creative', 'brainstorm', 'thoughts'] },
  { iconName: 'ShoppingCart', keywords: ['shopping', 'buy', 'purchase', 'shop', 'store', 'market'] },
  { iconName: 'Users',        keywords: ['team', 'people', 'group', 'social', 'meeting', 'meetings', 'friends', 'family'] },
  { iconName: 'Star',         keywords: ['favorites', 'favorite', 'starred', 'important', 'priority', 'top'] },
  { iconName: 'Calendar',     keywords: ['plan', 'planning', 'schedule', 'event', 'events', 'dates', 'calendar'] },
  { iconName: 'Target',       keywords: ['goal', 'goals', 'aim', 'focus', 'target', 'objective', 'objectives', 'okr'] },
  { iconName: 'Rocket',       keywords: ['startup', 'launch', 'project', 'projects', 'initiative'] },
  { iconName: 'FileText',     keywords: ['document', 'documents', 'file', 'files', 'writing', 'draft', 'report', 'reports'] },
  { iconName: 'Globe',        keywords: ['world', 'international', 'global', 'internet', 'web'] },
  { iconName: 'Heart',        keywords: ['love', 'life', 'wellbeing', 'wellness', 'mental'] },
  { iconName: 'Leaf',         keywords: ['garden', 'nature', 'eco', 'green', 'plants', 'environment'] },
  { iconName: 'Map',          keywords: ['map', 'location', 'places', 'explore', 'geography'] },
  { iconName: 'Coffee',       keywords: ['coffee', 'morning', 'cafe', 'break', 'food', 'drinks'] },
  { iconName: 'Flame',        keywords: ['hot', 'fire', 'urgent', 'trending'] },
  { iconName: 'Trophy',       keywords: ['achievement', 'achievements', 'award', 'awards', 'win', 'winner'] },
]

const STACK_ICON_LIST = [
  'Layers', 'Briefcase', 'Code', 'Home', 'Book', 'BookOpen', 'FileText',
  'DollarSign', 'Plane', 'Coffee', 'Activity', 'Music', 'Camera', 'Lightbulb',
  'ShoppingCart', 'Users', 'Star', 'Calendar', 'Target', 'Rocket', 'Globe',
  'Heart', 'Leaf', 'Map', 'Tag', 'Inbox', 'Folder', 'List', 'Pencil',
  'Bell', 'Package', 'Trophy', 'Flame', 'Zap', 'Shield',
]

function autoIconByName(name: string): string | null {
  if (!name.trim()) return null
  const words = new Set(name.toLowerCase().split(/\s+/).filter((w) => w.length >= 3))
  for (const { iconName, keywords } of STACK_ICON_HINTS) {
    if (keywords.some((k) => words.has(k))) return iconName
  }
  return null
}

// ── Inline stack create / rename form ───────────────────────────────────────
function StackNameForm({
  initial,
  initialIcon = null,
  autoSuggest = false,
  onSave,
  onCancel,
}: {
  initial: string
  initialIcon?: string | null
  autoSuggest?: boolean
  onSave: (name: string, icon: string | null) => void
  onCancel: () => void
}) {
  const [value, setValue] = useState(initial)
  const [icon, setIcon] = useState<string | null>(initialIcon)
  const [iconManuallySet, setIconManuallySet] = useState(!autoSuggest)
  const [showPicker, setShowPicker] = useState(false)

  // Auto-suggest icon as user types (only for create, not rename)
  useEffect(() => {
    if (iconManuallySet) return
    setIcon(autoIconByName(value))
  }, [value, iconManuallySet])

  const IconComp = icon
    ? (LucideIcons as unknown as Record<string, React.ComponentType<LucideProps>>)[icon]
    : null

  return (
    <div className="space-y-1 px-1 py-0.5">
      <form
        className="flex items-center gap-1"
        onSubmit={(e) => { e.preventDefault(); if (value.trim()) onSave(value.trim(), icon) }}
      >
        {/* Icon preview / picker toggle */}
        <button
          type="button"
          onClick={() => setShowPicker((v) => !v)}
          className={cn(
            'shrink-0 h-7 w-7 flex items-center justify-center rounded-md transition-colors',
            'text-muted-foreground hover:bg-accent/70 hover:text-foreground',
            showPicker && 'bg-accent/70 text-foreground',
          )}
          title="Pick icon"
        >
          {IconComp
            ? <IconComp className="h-3.5 w-3.5" />
            : <Layers className="h-3.5 w-3.5 opacity-35" />
          }
        </button>

        <input
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Escape') onCancel() }}
          className="flex-1 min-w-0 text-sm px-2 py-1 bg-background/60 rounded-md border border-input focus:outline-none focus:ring-1 focus:ring-ring transition-colors placeholder:text-muted-foreground/50"
          placeholder="Stack name…"
        />

        <button
          type="submit"
          disabled={!value.trim()}
          className="p-1.5 text-primary hover:opacity-70 disabled:opacity-30 shrink-0"
        >
          <Check className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="p-1.5 text-muted-foreground hover:opacity-70 shrink-0"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </form>

      {/* Compact icon picker grid */}
      {showPicker && (
        <div className="grid grid-cols-8 gap-0.5 p-1.5 rounded-md bg-accent/20 border border-border/40">
          {/* No icon */}
          <button
            type="button"
            onClick={() => { setIcon(null); setIconManuallySet(true); setShowPicker(false) }}
            title="No icon"
            className={cn(
              'h-7 w-7 rounded flex items-center justify-center text-muted-foreground hover:bg-background/80 transition-colors',
              icon === null && 'ring-1 ring-primary bg-background/80',
            )}
          >
            <X className="h-3 w-3" />
          </button>
          {STACK_ICON_LIST.map((iconName) => {
            const Ic = (LucideIcons as unknown as Record<string, React.ComponentType<LucideProps>>)[iconName]
            if (!Ic) return null
            return (
              <button
                key={iconName}
                type="button"
                onClick={() => { setIcon(iconName); setIconManuallySet(true); setShowPicker(false) }}
                title={iconName}
                className={cn(
                  'h-7 w-7 rounded flex items-center justify-center hover:bg-background/80 transition-colors text-foreground/70 hover:text-foreground',
                  icon === iconName && 'ring-1 ring-primary bg-background/80 text-foreground',
                )}
              >
                <Ic className="h-3.5 w-3.5" />
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Stack nav item with hover kebab ─────────────────────────────────────────
function StackNavItem({
  stack,
  onClick,
}: {
  stack: Stack
  onClick?: () => void
}) {
  const qc = useQueryClient()
  const [renaming, setRenaming] = useState(false)

  function invalidate() {
    qc.invalidateQueries({ queryKey: [['stacks']] })
    qc.invalidateQueries({ queryKey: [['notes']] })
  }

  const updateStack = trpc.stacks.update.useMutation({ onSuccess: () => { invalidate(); setRenaming(false) } })
  const deleteStack = trpc.stacks.delete.useMutation({ onSuccess: invalidate })

  if (renaming) {
    return (
      <StackNameForm
        initial={stack.name}
        initialIcon={stack.icon ?? null}
        onSave={(name, icon) => updateStack.mutate({ id: stack.id, name, icon: icon })}
        onCancel={() => setRenaming(false)}
      />
    )
  }

  return (
    <NavLink
      to={`/stack/${stack.id}`}
      onClick={onClick}
      className={({ isActive }) =>
        cn(
          'group flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
          isActive
            ? 'bg-accent text-accent-foreground font-medium'
            : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
        )
      }
    >
      <LabelIcon icon={stack.icon} color={stack.color} size={16} />
      <span className="flex-1 truncate">{stack.name}</span>
      {/* Kebab actions (visible on hover) */}
      <span className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setRenaming(true) }}
          className="p-0.5 rounded hover:bg-black/10 dark:hover:bg-white/10"
          title="Rename"
        >
          <Pencil className="h-3 w-3" />
        </button>
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); deleteStack.mutate({ id: stack.id }) }}
          className="p-0.5 rounded hover:bg-black/10 dark:hover:bg-white/10 text-destructive/60 hover:text-destructive"
          title="Delete stack"
        >
          <TrashIcon className="h-3 w-3" />
        </button>
      </span>
    </NavLink>
  )
}

// ── Main Sidebar ─────────────────────────────────────────────────────────────
export function Sidebar() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { data: labels } = trpc.labels.list.useQuery()
  const { data: stacks } = trpc.stacks.list.useQuery()
  const [labelManagerOpen, setLabelManagerOpen] = useState(false)
  const [creatingStack, setCreatingStack] = useState(false)
  const { setSidebarOpen } = useUIStore()
  const { data: session } = authClient.useSession()
  const isAdmin = (session?.user as { role?: string } | undefined)?.role === 'admin'

  const createStack = trpc.stacks.create.useMutation({
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [['stacks']] })
      setCreatingStack(false)
    },
  })

  function handleNavClick() {
    if (window.innerWidth < 768) setSidebarOpen(false)
  }

  async function handleSignOut() {
    await authClient.signOut()
    navigate('/login')
  }

  return (
    <aside className="flex flex-col h-full w-64 border-r bg-background/95 backdrop-blur">
      {/* App logo — height must match TopBar (h-[60px]) */}
      <div className="flex items-center gap-2.5 px-4 h-[60px] shrink-0">
        <img
          src="/icon.png"
          alt="NoteStack"
          className="h-8 w-8 rounded-lg object-cover shrink-0"
        />
        <span className="font-semibold text-base">NoteStack</span>
      </div>

      <Separator />

      {/* Main nav */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">

        {/* ── Stacks — exclusive workspaces ──────────────────────────────── */}
        <div className="px-3 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Stacks
        </div>

        {/* Default workspace = notes with no stack */}
        <NavLink
          to="/"
          end
          onClick={handleNavClick}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
              isActive
                ? 'bg-accent text-accent-foreground font-medium'
                : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
            )
          }
        >
          <Inbox className="h-4 w-4" />
          <span>Default</span>
        </NavLink>

        {/* User-created stacks — scrollable if many */}
        {stacks && stacks.length > 0 && (
          <div className="max-h-[200px] overflow-y-auto space-y-0.5 pr-0.5">
            {stacks.map((stack) => (
              <StackNavItem key={stack.id} stack={stack} onClick={handleNavClick} />
            ))}
          </div>
        )}

        {/* Create stack form / button */}
        {creatingStack && (
          <StackNameForm
            initial=""
            autoSuggest
            onSave={(name, icon) => createStack.mutate({ name, icon: icon === null ? undefined : icon })}
            onCancel={() => setCreatingStack(false)}
          />
        )}
        {!creatingStack && (
          <button
            onClick={() => setCreatingStack(true)}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-accent/50 hover:text-foreground transition-colors w-full"
          >
            <Plus className="h-4 w-4" />
            <span>New stack</span>
          </button>
        )}

        <Separator className="my-2" />

        {/* Global nav */}
        <NavItem to="/reminders" icon={<Bell className="h-4 w-4" />} label="Reminders" onClick={handleNavClick} />
        <NavItem to="/archive" icon={<Archive className="h-4 w-4" />} label="Archive" onClick={handleNavClick} />
        <NavItem to="/trash" icon={<Trash2 className="h-4 w-4" />} label="Trash" onClick={handleNavClick} />

        {/* ── Labels section ──────────────────────────────────────────────── */}
        {labels && labels.length > 0 && (
          <>
            <Separator className="my-2" />
            <div className="px-3 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Labels
            </div>
            <div className="max-h-[180px] overflow-y-auto space-y-0.5 pr-0.5">
              {labels.map((label) => (
                <NavLink
                  key={label.id}
                  to={`/label/${label.id}`}
                  onClick={handleNavClick}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                      isActive
                        ? 'bg-accent text-accent-foreground font-medium'
                        : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
                    )
                  }
                >
                  <LabelIcon icon={label.icon} color={label.color} size={16} />
                  <span className="truncate">{label.name}</span>
                </NavLink>
              ))}
            </div>
          </>
        )}

        <button
          onClick={() => setLabelManagerOpen(true)}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-accent/50 hover:text-foreground transition-colors w-full"
        >
          <Tag className="h-4 w-4" />
          <span>Manage labels</span>
          <ChevronRight className="h-3 w-3 ml-auto" />
        </button>
      </nav>

      <Separator />

      {/* Bottom actions */}
      <div className="p-3 space-y-1">
        <NavItem to="/settings" icon={<User className="h-4 w-4" />} label="My settings" onClick={handleNavClick} />
        {isAdmin && <NavItem to="/admin" icon={<Settings className="h-4 w-4" />} label="Admin" onClick={handleNavClick} />}
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-accent/50 hover:text-foreground transition-colors w-full"
        >
          <LogOut className="h-4 w-4" />
          <span>Sign out</span>
        </button>
      </div>

      <LabelManager open={labelManagerOpen} onOpenChange={setLabelManagerOpen} />
    </aside>
  )
}
