import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type ViewMode = 'grid' | 'list'

interface UIState {
  sidebarOpen: boolean
  viewMode: ViewMode
  theme: 'light' | 'dark' | 'system'
  editorOpen: boolean
  selectedNoteIds: string[]
  // 0 = auto (CSS grid auto-fill); 1-6 = fixed column count
  gridColumns: number
  setSidebarOpen: (open: boolean) => void
  toggleSidebar: () => void
  setViewMode: (mode: ViewMode) => void
  setTheme: (theme: 'light' | 'dark' | 'system') => void
  setEditorOpen: (open: boolean) => void
  toggleNoteSelection: (id: string) => void
  clearNoteSelection: () => void
  setGridColumns: (cols: number) => void
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarOpen: true,
      viewMode: 'grid',
      theme: 'system',
      editorOpen: false,
      selectedNoteIds: [],
      gridColumns: 0,
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      setViewMode: (viewMode) => set({ viewMode }),
      setTheme: (theme) => set({ theme }),
      setEditorOpen: (open) => set({ editorOpen: open }),
      toggleNoteSelection: (id) =>
        set((s) => ({
          selectedNoteIds: s.selectedNoteIds.includes(id)
            ? s.selectedNoteIds.filter((x) => x !== id)
            : [...s.selectedNoteIds, id],
        })),
      clearNoteSelection: () => set({ selectedNoteIds: [] }),
      setGridColumns: (gridColumns) => set({ gridColumns }),
    }),
    {
      name: 'notestack-ui',
      // Only persist display preferences — not transient UI state
      partialize: (state) => ({
        theme: state.theme,
        viewMode: state.viewMode,
        sidebarOpen: state.sidebarOpen,
        gridColumns: state.gridColumns,
      }),
    },
  ),
)
