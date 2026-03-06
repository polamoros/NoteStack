import { useParams } from 'react-router-dom'
import { trpc } from '@/api/client'
import { FileText, AlertCircle } from 'lucide-react'
import { LabelIcon } from '@/components/labels/LabelIcon'

function extractText(node: any): string {
  if (node.type === 'text') return node.text ?? ''
  if (!node.content) return ''
  return node.content.map(extractText).join(node.type === 'paragraph' ? '\n' : '')
}

/** Minimal rich-text renderer without Tiptap dep — renders text paragraphs, headings, code */
function RichContent({ json }: { json: string }) {
  let doc: any
  try { doc = JSON.parse(json) } catch { return <pre className="whitespace-pre-wrap text-sm">{json}</pre> }

  function renderNode(node: any, i: number): React.ReactNode {
    switch (node.type) {
      case 'paragraph':
        return <p key={i} className="text-sm leading-relaxed mb-2 empty:h-4">{(node.content ?? []).map(renderNode)}</p>
      case 'heading':
        return node.attrs?.level === 1
          ? <h1 key={i} className="text-xl font-bold mb-2">{(node.content ?? []).map(renderNode)}</h1>
          : node.attrs?.level === 2
            ? <h2 key={i} className="text-lg font-semibold mb-1.5">{(node.content ?? []).map(renderNode)}</h2>
            : <h3 key={i} className="text-base font-semibold mb-1">{(node.content ?? []).map(renderNode)}</h3>
      case 'codeBlock':
        return (
          <pre key={i} className="bg-slate-900 text-slate-100 rounded-lg p-3 text-sm font-mono mb-2 overflow-x-auto">
            <code>{(node.content ?? []).map(renderNode)}</code>
          </pre>
        )
      case 'bulletList':
        return <ul key={i} className="list-disc pl-5 mb-2 space-y-0.5">{(node.content ?? []).map(renderNode)}</ul>
      case 'orderedList':
        return <ol key={i} className="list-decimal pl-5 mb-2 space-y-0.5">{(node.content ?? []).map(renderNode)}</ol>
      case 'listItem':
        return <li key={i} className="text-sm">{(node.content ?? []).map(renderNode)}</li>
      case 'blockquote':
        return <blockquote key={i} className="border-l-4 border-muted pl-3 italic text-muted-foreground mb-2">{(node.content ?? []).map(renderNode)}</blockquote>
      case 'horizontalRule':
        return <hr key={i} className="my-3 border-border" />
      case 'text': {
        let el: React.ReactNode = node.text
        const marks: any[] = node.marks ?? []
        if (marks.some((m: any) => m.type === 'bold')) el = <strong>{el}</strong>
        if (marks.some((m: any) => m.type === 'italic')) el = <em>{el}</em>
        if (marks.some((m: any) => m.type === 'code')) el = <code className="bg-slate-800 text-blue-300 text-[0.82em] px-1.5 py-0.5 rounded font-mono">{el}</code>
        if (marks.some((m: any) => m.type === 'strike')) el = <s>{el}</s>
        return <span key={i}>{el}</span>
      }
      default:
        return null
    }
  }

  return <div>{(doc.content ?? []).map(renderNode)}</div>
}

export function PublicNotePage() {
  const { token } = useParams<{ token: string }>()

  const { data: note, isLoading, error } = trpc.sharing.getPublicNote.useQuery(
    { token: token! },
    { enabled: !!token, retry: false },
  )

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    )
  }

  if (error || !note) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-center px-4">
        <AlertCircle className="h-12 w-12 text-muted-foreground" />
        <h1 className="text-xl font-semibold">Note not found</h1>
        <p className="text-muted-foreground text-sm max-w-sm">
          This link may have been disabled or the note no longer exists.
        </p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b px-4 py-3 flex items-center gap-2">
        <FileText className="h-5 w-5 text-primary" />
        <span className="font-medium text-sm text-muted-foreground">Shared note</span>
        <span className="ml-auto text-xs text-muted-foreground">Read only</span>
      </header>

      {/* Note */}
      <main className="max-w-2xl mx-auto px-4 py-8">
        {note.title && (
          <h1 className="text-2xl font-bold mb-4">{note.title}</h1>
        )}

        {/* Labels */}
        {note.labels.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {note.labels.map((label: any) => (
              <span
                key={label.id}
                className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full"
                style={
                  label.color
                    ? { background: label.color + '33', color: label.color, border: `1px solid ${label.color}55` }
                    : { background: 'hsl(var(--muted))', color: 'hsl(var(--muted-foreground))' }
                }
              >
                {(label.icon || label.color) && (
                  <LabelIcon icon={label.icon} color={label.color} size={11} />
                )}
                {label.name}
              </span>
            ))}
          </div>
        )}

        {/* Rich content */}
        {note.type === 'RICH' && note.content && (
          <RichContent json={note.content} />
        )}

        {/* Todo items */}
        {note.type === 'TODO' && note.todoItems.length > 0 && (
          <div className="space-y-1.5">
            {note.todoItems.map((item: any) => (
              <div key={item.id} className="flex items-center gap-2 text-sm">
                <div className={`h-4 w-4 rounded-sm border border-current flex items-center justify-center shrink-0 ${item.isChecked ? 'opacity-40' : ''}`}>
                  {item.isChecked && <span className="text-xs">✓</span>}
                </div>
                <span className={item.isChecked ? 'line-through opacity-40' : ''}>{item.text}</span>
              </div>
            ))}
          </div>
        )}

        {/* Task steps */}
        {note.type === 'TASK' && note.taskSteps.length > 0 && (
          <div className="space-y-1.5">
            {note.taskSteps.map((step: any) => (
              <div key={step.id} className="flex items-start gap-2 text-sm">
                <div className={`mt-0.5 h-4 w-4 rounded-full border border-current flex items-center justify-center shrink-0 ${step.isComplete ? 'opacity-40' : ''}`}>
                  {step.isComplete && <span className="text-xs">✓</span>}
                </div>
                <div>
                  <p className={step.isComplete ? 'line-through opacity-40' : ''}>{step.title}</p>
                  {step.description && (
                    <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <p className="mt-8 text-xs text-muted-foreground border-t pt-4">
          Last updated {new Date(note.updatedAt).toLocaleDateString()}
        </p>
      </main>
    </div>
  )
}
