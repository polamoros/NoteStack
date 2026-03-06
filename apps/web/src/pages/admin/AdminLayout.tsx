import { NavLink, Outlet, Navigate } from 'react-router-dom'
import { authClient } from '@/lib/auth-client'
import { cn } from '@/lib/utils'
import { Users, Shield, Settings, Activity, ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'

function AdminNavItem({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  return (
    <NavLink
      to={to}
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
      {label}
    </NavLink>
  )
}

export function AdminLayout() {
  const { data: session, isPending } = authClient.useSession()

  if (isPending) return null
  if (!session || session.user.role !== 'admin') {
    return <Navigate to="/" replace />
  }

  return (
    <div className="flex h-full">
      {/* Admin sidebar */}
      <aside className="w-56 border-r p-3 space-y-1 shrink-0">
        <Link
          to="/"
          className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to notes
        </Link>
        <div className="px-3 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Admin
        </div>
        <AdminNavItem to="/admin/users" icon={<Users className="h-4 w-4" />} label="Users" />
        <AdminNavItem to="/admin/auth" icon={<Shield className="h-4 w-4" />} label="Auth / OIDC" />
        <AdminNavItem to="/admin/settings" icon={<Settings className="h-4 w-4" />} label="App Settings" />
        <AdminNavItem to="/admin/system" icon={<Activity className="h-4 w-4" />} label="System" />
      </aside>

      <main className="flex-1 overflow-y-auto p-6">
        <Outlet />
      </main>
    </div>
  )
}
