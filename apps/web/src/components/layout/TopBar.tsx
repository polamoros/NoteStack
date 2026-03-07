import { Search, LayoutGrid, List, Menu, Sun, Moon, Monitor } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useUIStore } from '@/store/ui.store'
import { useFilterStore } from '@/store/filter.store'
import { useDebounce } from '@/hooks/useDebounce'
import { useEffect, useState } from 'react'
import { trpc } from '@/api/client'
import { useToast } from '@/hooks/useToast'
import { useQueryClient } from '@tanstack/react-query'
import { useSSE } from '@/hooks/useSSE'
import { authClient } from '@/lib/auth-client'

export function TopBar() {
  const { toggleSidebar, viewMode, setViewMode, theme, setTheme } = useUIStore()
  const { searchQuery, setSearchQuery } = useFilterStore()
  const [inputValue, setInputValue] = useState(searchQuery)
  const debouncedSearch = useDebounce(inputValue, 300)
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const { data: session } = authClient.useSession()

  const acknowledgeReminder = trpc.reminders.acknowledge.useMutation({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [['reminders']] })
    },
  })

  useSSE(!!session, {
    onReminder: (data: any) => {
      toast({
        title: `Reminder: ${data.noteTitle || 'Untitled'}`,
        description: 'Tap to acknowledge',
        action: (
          <Button
            size="sm"
            variant="outline"
            onClick={() => acknowledgeReminder.mutate({ id: data.reminderId })}
          >
            Done
          </Button>
        ) as any,
        duration: 10000,
      } as any)
    },
  })

  useEffect(() => {
    setSearchQuery(debouncedSearch)
  }, [debouncedSearch, setSearchQuery])

  function cycleTheme() {
    const next = theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light'
    setTheme(next)
  }

  return (
    <header className="relative flex items-center px-4 h-[60px] shrink-0 border-b bg-background/95 backdrop-blur sticky top-0 z-10">
      {/* Left: sidebar toggle */}
      <Button variant="ghost" size="icon-sm" onClick={toggleSidebar} className="shrink-0 relative z-10">
        <Menu className="h-4 w-4" />
      </Button>

      {/* Search — absolutely centered in the header */}
      <div className="absolute inset-x-0 top-0 h-full flex items-center justify-center pointer-events-none px-14">
        <div className="relative w-full max-w-xl pointer-events-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search notes…"
            className="pl-9 bg-secondary/50 border-0 focus-visible:ring-1"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
          />
        </div>
      </div>

      {/* Right controls */}
      <div className="ml-auto flex items-center gap-1 shrink-0 relative z-10">
        <Button
          variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
          size="icon-sm"
          onClick={() => setViewMode('grid')}
          title="Grid view"
        >
          <LayoutGrid className="h-4 w-4" />
        </Button>
        <Button
          variant={viewMode === 'list' ? 'secondary' : 'ghost'}
          size="icon-sm"
          onClick={() => setViewMode('list')}
          title="List view"
        >
          <List className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={cycleTheme}
          title={`Theme: ${theme}`}
        >
          {theme === 'dark' ? (
            <Moon className="h-4 w-4" />
          ) : theme === 'system' ? (
            <Monitor className="h-4 w-4" />
          ) : (
            <Sun className="h-4 w-4" />
          )}
        </Button>
      </div>
    </header>
  )
}
