import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import { useUIStore } from '@/store/ui.store'
import { cn } from '@/lib/utils'
import { Toaster } from '@/components/ui/toaster'

export function AppShell() {
  const { sidebarOpen } = useUIStore()

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <div
        className={cn(
          'transition-all duration-200 overflow-hidden shrink-0',
          sidebarOpen ? 'w-64' : 'w-0',
        )}
      >
        <Sidebar />
      </div>

      {/* Main content */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>

      <Toaster />
    </div>
  )
}
