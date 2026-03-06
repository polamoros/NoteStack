import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import { useUIStore } from '@/store/ui.store'
import { Toaster } from '@/components/ui/toaster'
import { NoteMultiSelectBar } from '@/components/notes/NoteMultiSelectBar'

export function AppShell() {
  const { sidebarOpen, setSidebarOpen } = useUIStore()

  // Close sidebar by default on mobile
  useEffect(() => {
    if (window.innerWidth < 768) {
      setSidebarOpen(false)
    }
  }, []) // eslint-disable-line

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop sidebar — push style */}
      <div
        className={`hidden md:block transition-all duration-200 overflow-hidden shrink-0 ${sidebarOpen ? 'w-64' : 'w-0'}`}
      >
        <Sidebar />
      </div>

      {/* Mobile sidebar — fixed overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="relative w-64 h-full shadow-xl">
            <Sidebar />
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>

      <Toaster />
      <NoteMultiSelectBar />
    </div>
  )
}
