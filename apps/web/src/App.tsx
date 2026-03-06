import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { authClient } from '@/lib/auth-client'
import { AppShell } from '@/components/layout/AppShell'
import { LoginPage } from '@/pages/LoginPage'
import { SetupPage } from '@/pages/SetupPage'
import { NotesPage } from '@/pages/NotesPage'
import { ArchivePage } from '@/pages/ArchivePage'
import { TrashPage } from '@/pages/TrashPage'
import { RemindersPage } from '@/pages/RemindersPage'
import { LabelPage } from '@/pages/LabelPage'
import { StackPage } from '@/pages/StackPage'
import { UserSettingsPage } from '@/pages/UserSettingsPage'
import { PublicNotePage } from '@/pages/PublicNotePage'
import { AdminLayout } from '@/pages/admin/AdminLayout'
import { AdminUsersPage } from '@/pages/admin/UsersPage'
import { AdminAuthConfigPage } from '@/pages/admin/AuthConfigPage'
import { AdminAppSettingsPage } from '@/pages/admin/AppSettingsPage'
import { AdminSystemPage } from '@/pages/admin/SystemPage'
import { trpc } from '@/api/client'
import { useUIStore } from '@/store/ui.store'

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { data: session, isPending } = authClient.useSession()
  const { data: setup } = trpc.settings.checkSetup.useQuery()

  if (isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    )
  }

  if (setup && !setup.setupComplete) {
    return <Navigate to="/setup" replace />
  }

  if (!session) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

export function App() {
  const { data: setup } = trpc.settings.checkSetup.useQuery()
  const { data: session } = authClient.useSession()
  const theme = useUIStore((s) => s.theme)

  // Sync theme preference to <html> class
  useEffect(() => {
    const root = document.documentElement
    if (theme === 'dark') {
      root.classList.add('dark')
    } else if (theme === 'light') {
      root.classList.remove('dark')
    } else {
      const mq = window.matchMedia('(prefers-color-scheme: dark)')
      const apply = () => {
        if (mq.matches) root.classList.add('dark')
        else root.classList.remove('dark')
      }
      apply()
      mq.addEventListener('change', apply)
      return () => mq.removeEventListener('change', apply)
    }
  }, [theme])

  return (
    <Routes>
      <Route
        path="/setup"
        element={
          setup?.setupComplete || session ? <Navigate to="/" replace /> : <SetupPage />
        }
      />

      <Route
        path="/login"
        element={session ? <Navigate to="/" replace /> : <LoginPage />}
      />

      {/* Public share route — no auth required */}
      <Route path="/share/:token" element={<PublicNotePage />} />

      <Route
        path="/"
        element={
          <AuthGuard>
            <AppShell />
          </AuthGuard>
        }
      >
        <Route index element={<NotesPage />} />
        <Route path="archive" element={<ArchivePage />} />
        <Route path="trash" element={<TrashPage />} />
        <Route path="reminders" element={<RemindersPage />} />
        <Route path="label/:id" element={<LabelPage />} />
        <Route path="stack/:id" element={<StackPage />} />
        <Route path="settings" element={<UserSettingsPage />} />

        <Route path="admin" element={<AdminLayout />}>
          <Route index element={<Navigate to="/admin/users" replace />} />
          <Route path="users" element={<AdminUsersPage />} />
          <Route path="auth" element={<AdminAuthConfigPage />} />
          <Route path="settings" element={<AdminAppSettingsPage />} />
          <Route path="system" element={<AdminSystemPage />} />
        </Route>
      </Route>
    </Routes>
  )
}
