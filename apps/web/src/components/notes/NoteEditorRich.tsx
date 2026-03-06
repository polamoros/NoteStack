import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Link from '@tiptap/extension-link'
import { useEffect } from 'react'
import { Bold, Italic, List, ListOrdered, Link as LinkIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface NoteEditorRichProps {
  content: string | null
  onChange: (content: string) => void
  className?: string
}

export function NoteEditorRich({ content, onChange, className }: NoteEditorRichProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: 'Write something…' }),
      Link.configure({ openOnClick: false }),
    ],
    content: content ? JSON.parse(content) : null,
    onUpdate: ({ editor }) => {
      onChange(JSON.stringify(editor.getJSON()))
    },
    editorProps: {
      attributes: {
        class: 'tiptap prose prose-sm dark:prose-invert max-w-none focus:outline-none min-h-[100px] p-0',
      },
    },
  })

  // Sync content from outside (e.g. title changes)
  useEffect(() => {
    if (!editor) return
    const currentContent = JSON.stringify(editor.getJSON())
    const newContent = content || null
    if (newContent && currentContent !== newContent) {
      try {
        editor.commands.setContent(JSON.parse(newContent), false)
      } catch {}
    }
  }, [content]) // eslint-disable-line

  if (!editor) return null

  return (
    <div className={cn('space-y-2', className)}>
      {/* Formatting toolbar */}
      <div className="flex items-center gap-0.5 border-b pb-2">
        <ToolbarButton
          active={editor.isActive('bold')}
          onClick={() => editor.chain().focus().toggleBold().run()}
          title="Bold"
        >
          <Bold className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive('italic')}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          title="Italic"
        >
          <Italic className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive('bulletList')}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          title="Bullet list"
        >
          <List className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive('orderedList')}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          title="Ordered list"
        >
          <ListOrdered className="h-3.5 w-3.5" />
        </ToolbarButton>
      </div>

      <EditorContent editor={editor} />
    </div>
  )
}

function ToolbarButton({
  active,
  onClick,
  title,
  children,
}: {
  active: boolean
  onClick: () => void
  title: string
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={cn(
        'p-1.5 rounded text-sm transition-colors',
        active
          ? 'bg-accent text-accent-foreground'
          : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
      )}
    >
      {children}
    </button>
  )
}
