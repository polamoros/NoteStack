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
import { useState } from 'react'
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

// ── Inline stack create / rename form ───────────────────────────────────────
function StackNameForm({
  initial,
  onSave,
  onCancel,
}: {
  initial: string
  onSave: (name: string) => void
  onCancel: () => void
}) {
  const [value, setValue] = useState(initial)
  return (
    <form
      className="flex items-center gap-1"
      onSubmit={(e) => { e.preventDefault(); if (value.trim()) onSave(value.trim()) }}
    >
      <input
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Escape') onCancel() }}
        className={cn(
          'flex-1 text-sm px-3 py-2 rounded-lg bg-background border border-input',
          'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1',
        )}
        placeholder="Stack name"
      />
      <button type="submit" className="p-1.5 text-primary hover:opacity-70 shrink-0">
        <Check className="h-3.5 w-3.5" />
      </button>
      <button type="button" onClick={onCancel} className="p-1.5 text-muted-foreground hover:opacity-70 shrink-0">
        <X className="h-3.5 w-3.5" />
      </button>
    </form>
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
        onSave={(name) => updateStack.mutate({ id: stack.id, name })}
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
            onSave={(name) => createStack.mutate({ name })}
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
