import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { trpc } from '@/api/client'
import { useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2, Check, X } from 'lucide-react'

interface LabelManagerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function LabelManager({ open, onOpenChange }: LabelManagerProps) {
  const qc = useQueryClient()
  const { data: labels = [] } = trpc.labels.list.useQuery()
  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')

  function invalidate() {
    qc.invalidateQueries({ queryKey: [['labels']] })
    qc.invalidateQueries({ queryKey: [['notes']] })
  }

  const createLabel = trpc.labels.create.useMutation({ onSuccess: () => { invalidate(); setNewName('') } })
  const updateLabel = trpc.labels.update.useMutation({ onSuccess: () => { invalidate(); setEditingId(null) } })
  const deleteLabel = trpc.labels.delete.useMutation({ onSuccess: invalidate })

  function handleCreate() {
    if (!newName.trim()) return
    createLabel.mutate({ name: newName.trim() })
  }

  function startEdit(id: string, name: string) {
    setEditingId(id)
    setEditName(name)
  }

  function handleUpdate() {
    if (!editingId || !editName.trim()) return
    updateLabel.mutate({ id: editingId, name: editName.trim() })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Manage Labels</DialogTitle>
        </DialogHeader>

        {/* Create new label */}
        <div className="flex gap-2">
          <Input
            placeholder="New label name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleCreate() }}
          />
          <Button size="icon" onClick={handleCreate} disabled={!newName.trim()}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {/* Label list */}
        <div className="space-y-1 max-h-64 overflow-y-auto">
          {labels.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">No labels yet</p>
          )}
          {labels.map((label) => (
            <div key={label.id} className="flex items-center gap-2 group">
              {editingId === label.id ? (
                <>
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleUpdate()
                      if (e.key === 'Escape') setEditingId(null)
                    }}
                    className="h-8 text-sm"
                    autoFocus
                  />
                  <button onClick={handleUpdate} className="text-green-600 hover:text-green-700">
                    <Check className="h-4 w-4" />
                  </button>
                  <button onClick={() => setEditingId(null)} className="text-muted-foreground hover:text-foreground">
                    <X className="h-4 w-4" />
                  </button>
                </>
              ) : (
                <>
                  <span className="flex-1 text-sm truncate">{label.name}</span>
                  <button
                    onClick={() => startEdit(label.id, label.name)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => deleteLabel.mutate({ id: label.id })}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
