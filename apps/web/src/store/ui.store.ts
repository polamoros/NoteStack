import { create } from 'zustand'

type ViewMode = 'grid' | 'list'

interface UIState {
  sidebarOpen: boolean
  viewMode: ViewMode
  theme: 'light' | 'dark' | 'system'
  setSidebarOpen: (open: boolean) => void
  toggleSidebar: () => void
  setViewMode: (mode: ViewMode) => void
  setTheme: (theme: 'light' | 'dark' | 'system') => void
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  viewMode: 'grid',
  theme: 'system',
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setViewMode: (viewMode) => set({ viewMode }),
  setTheme: (theme) => set({ theme }),
}))
