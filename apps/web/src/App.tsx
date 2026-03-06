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
import { AdminLayout } from '@/pages/admin/AdminLayout'
import { AdminUsersPage } from '@/pages/admin/UsersPage'
import { AdminAuthConfigPage } from '@/pages/admin/AuthConfigPage'
import { AdminAppSettingsPage } from '@/pages/admin/AppSettingsPage'
import { AdminSystemPage } from '@/pages/admin/SystemPage'
import { trpc } from '@/api/client'

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

  // Redirect to setup if not completed
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

  return (
    <Routes>
      {/* Setup wizard (only before first user is created) */}
      <Route
        path="/setup"
        element={
          setup?.setupComplete || session ? <Navigate to="/" replace /> : <SetupPage />
        }
      />

      {/* Login */}
      <Route
        path="/login"
        element={session ? <Navigate to="/" replace /> : <LoginPage />}
      />

      {/* Protected routes */}
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

        {/* Admin routes */}
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
