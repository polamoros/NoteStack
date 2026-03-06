import { create } from 'zustand'

interface FilterState {
  searchQuery: string
  activeLabelId: string | null
  setSearchQuery: (q: string) => void
  setActiveLabelId: (id: string | null) => void
  clearFilters: () => void
}

export const useFilterStore = create<FilterState>((set) => ({
  searchQuery: '',
  activeLabelId: null,
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setActiveLabelId: (activeLabelId) => set({ activeLabelId }),
  clearFilters: () => set({ searchQuery: '', activeLabelId: null }),
}))
