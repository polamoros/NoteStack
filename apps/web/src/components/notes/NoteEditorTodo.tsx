import { useState } from 'react'
import { trpc } from '@/api/client'
import { useQueryClient } from '@tanstack/react-query'
import type { Note } from '@notes/shared'
import { cn } from '@/lib/utils'
import { Plus, X } from 'lucide-react'

interface NoteEditorTodoProps {
  noteId: string
  items: Note['todoItems']
}

export function NoteEditorTodo({ noteId, items }: NoteEditorTodoProps) {
  const qc = useQueryClient()
  const [newText, setNewText] = useState('')

  function invalidate() {
    qc.invalidateQueries({ queryKey: [['notes']] })
  }

  const createItem = trpc.todoItems.create.useMutation({ onSuccess: invalidate })
  const updateItem = trpc.todoItems.update.useMutation({ onSuccess: invalidate })
  const deleteItem = trpc.todoItems.delete.useMutation({ onSuccess: invalidate })

  function handleAddItem() {
    if (!newText.trim()) return
    createItem.mutate({ noteId, text: newText.trim() })
    setNewText('')
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddItem()
    }
  }

  const unchecked = items.filter((i) => !i.isChecked)
  const checked = items.filter((i) => i.isChecked)

  return (
    <div className="space-y-1">
      {/* Unchecked items */}
      {unchecked.map((item) => (
        <TodoItemRow
          key={item.id}
          item={item}
          onToggle={(checked) => updateItem.mutate({ id: item.id, isChecked: checked })}
          onTextChange={(text) => updateItem.mutate({ id: item.id, text })}
          onDelete={() => deleteItem.mutate({ id: item.id })}
        />
      ))}

      {/* Add new item */}
      <div className="flex items-center gap-2 py-1">
        <div className="h-4 w-4 shrink-0 rounded-sm border border-muted-foreground/40" />
        <input
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          placeholder="List item"
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleAddItem}
        />
        {newText && (
          <button onClick={handleAddItem} className="text-muted-foreground hover:text-foreground">
            <Plus className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Checked items (collapsed section) */}
      {checked.length > 0 && (
        <div className="mt-3">
          <p className="text-xs text-muted-foreground mb-1">
            {checked.length} completed item{checked.length > 1 ? 's' : ''}
          </p>
          {checked.map((item) => (
            <TodoItemRow
              key={item.id}
              item={item}
              onToggle={(c) => updateItem.mutate({ id: item.id, isChecked: c })}
              onTextChange={(text) => updateItem.mutate({ id: item.id, text })}
              onDelete={() => deleteItem.mutate({ id: item.id })}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function TodoItemRow({
  item,
  onToggle,
  onTextChange,
  onDelete,
}: {
  item: Note['todoItems'][0]
  onToggle: (checked: boolean) => void
  onTextChange: (text: string) => void
  onDelete: () => void
}) {
  const [text, setText] = useState(item.text)

  return (
    <div className="flex items-start gap-2 group/item py-0.5">
      <button
        className={cn(
          'mt-0.5 h-4 w-4 shrink-0 rounded-sm border transition-colors flex items-center justify-center',
          item.isChecked
            ? 'bg-muted-foreground border-muted-foreground text-background'
            : 'border-muted-foreground/40 hover:border-muted-foreground',
        )}
        onClick={() => onToggle(!item.isChecked)}
      >
        {item.isChecked && <span className="text-xs leading-none">✓</span>}
      </button>
      <input
        className={cn(
          'flex-1 bg-transparent text-sm outline-none',
          item.isChecked && 'line-through text-muted-foreground',
        )}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => { if (text !== item.text) onTextChange(text) }}
        onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }}
      />
      <button
        className="opacity-0 group-hover/item:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
        onClick={onDelete}
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
