import { NavLink, useNavigate } from 'react-router-dom'
import {
  FileText, Archive, Trash2, Bell, Tag, Settings, LogOut, ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { trpc } from '@/api/client'
import { authClient } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { LabelManager } from '@/components/labels/LabelManager'
import { useState } from 'react'

interface NavItemProps {
  to: string
  icon: React.ReactNode
  label: string
  end?: boolean
}

function NavItem({ to, icon, label, end }: NavItemProps) {
  return (
    <NavLink
      to={to}
      end={end}
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

export function Sidebar() {
  const navigate = useNavigate()
  const { data: labels } = trpc.labels.list.useQuery()
  const [labelManagerOpen, setLabelManagerOpen] = useState(false)

  async function handleSignOut() {
    await authClient.signOut()
    navigate('/login')
  }

  return (
    <aside className="flex flex-col h-full w-64 border-r bg-background/95 backdrop-blur">
      {/* Logo */}
      <div className="flex items-center gap-2 px-4 py-5">
        <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
          <FileText className="h-4 w-4 text-primary-foreground" />
        </div>
        <span className="font-semibold text-base">Notes</span>
      </div>

      <Separator />

      {/* Main nav */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        <NavItem to="/" icon={<FileText className="h-4 w-4" />} label="Notes" end />
        <NavItem to="/reminders" icon={<Bell className="h-4 w-4" />} label="Reminders" />
        <NavItem to="/archive" icon={<Archive className="h-4 w-4" />} label="Archive" />
        <NavItem to="/trash" icon={<Trash2 className="h-4 w-4" />} label="Trash" />

        {/* Labels section */}
        {labels && labels.length > 0 && (
          <>
            <Separator className="my-2" />
            <div className="px-3 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Labels
            </div>
            {labels.map((label) => (
              <NavLink
                key={label.id}
                to={`/label/${label.id}`}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                    isActive
                      ? 'bg-accent text-accent-foreground font-medium'
                      : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
                  )
                }
              >
                <Tag className="h-4 w-4" />
                <span className="truncate">{label.name}</span>
              </NavLink>
            ))}
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
        <NavItem to="/admin" icon={<Settings className="h-4 w-4" />} label="Admin" />
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
