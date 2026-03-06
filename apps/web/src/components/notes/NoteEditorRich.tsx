import {
  useEditor, EditorContent, Node, mergeAttributes,
  ReactNodeViewRenderer, NodeViewWrapper,
} from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Link from '@tiptap/extension-link'
import { useEffect, useRef, useState } from 'react'
import {
  Bold, Italic, List, ListOrdered, Heading2, Heading3,
  Code, Minus, ImagePlus, Link2, HelpCircle, FileCode2, X, Mic, Square,
  ChevronDown,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { JSONContent } from '@tiptap/react'

// ── Image node view with hover controls (resize + alignment) ──────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ImageView({ node, updateAttributes }: any) {
  const { src, alt, width, align } = node.attrs as {
    src: string; alt: string | null; width: string | null; align: string | null
  }
  const [showControls, setShowControls] = useState(false)

  const alignStyle: React.CSSProperties =
    align === 'left'   ? { marginRight: 'auto', marginLeft: 0 } :
    align === 'right'  ? { marginLeft: 'auto', marginRight: 0 } :
    align === 'center' ? { marginLeft: 'auto', marginRight: 'auto' } :
    {}

  return (
    <NodeViewWrapper>
      <div
        className="my-2 block"
        style={{ width: width ?? '100%', maxWidth: '100%', ...alignStyle }}
        onMouseEnter={() => setShowControls(true)}
        onMouseLeave={() => setShowControls(false)}
      >
        <img
          src={src}
          alt={alt ?? ''}
          draggable={false}
          className="rounded-lg block max-w-full"
          style={{ width: '100%' }}
        />
        {/* Controls bar — shown on hover, displayed below the image (no overflow clipping issue) */}
        {showControls && (
          <div className="flex items-center justify-center gap-1 mt-1 flex-wrap">
            <div className="flex gap-0.5 bg-black/75 rounded-full px-2 py-1">
              {['25%', '50%', '75%', '100%'].map((w) => (
                <button
                  key={w}
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); updateAttributes({ width: w }) }}
                  className={cn(
                    'text-[11px] px-1.5 py-0.5 rounded-full text-white transition-colors',
                    width === w ? 'bg-white/35' : 'hover:bg-white/20',
                  )}
                >
                  {w}
                </button>
              ))}
            </div>
            <div className="flex gap-0.5 bg-black/75 rounded-full px-2 py-1">
              {[
                { key: 'left',   label: '⇤' },
                { key: 'center', label: '↔' },
                { key: 'right',  label: '⇥' },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); updateAttributes({ align: key }) }}
                  className={cn(
                    'text-[11px] px-1.5 py-0.5 rounded-full text-white transition-colors',
                    align === key ? 'bg-white/35' : 'hover:bg-white/20',
                  )}
                  title={`Align ${key}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </NodeViewWrapper>
  )
}

// ── Audio node view ───────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function AudioView({ node }: any) {
  return (
    <NodeViewWrapper>
      <div className="my-2">
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <audio controls src={node.attrs.src} className="h-9 max-w-full w-72" />
      </div>
    </NodeViewWrapper>
  )
}

// ── Custom ImageNode (block, resizable) ───────────────────────────────────────
const ImageNode = Node.create({
  name: 'image',
  group: 'block',
  atom: true,

  addAttributes() {
    return {
      src:   { default: null },
      alt:   { default: null },
      title: { default: null },
      width: { default: null },
      align: { default: null }, // 'left' | 'center' | 'right' | null
    }
  },

  parseHTML() { return [{ tag: 'img[src]' }] },

  renderHTML({ HTMLAttributes }: { HTMLAttributes: Record<string, unknown> }) {
    return ['img', mergeAttributes({ class: 'tiptap-image' }, HTMLAttributes as Record<string, string>)]
  },

  addNodeView() { return ReactNodeViewRenderer(ImageView) },
})

// ── Custom AudioNode ──────────────────────────────────────────────────────────
const AudioNode = Node.create({
  name: 'audio',
  group: 'block',
  atom: true,

  addAttributes() {
    return { src: { default: null } }
  },

  parseHTML() { return [{ tag: 'audio[src]' }] },

  renderHTML({ HTMLAttributes }: { HTMLAttributes: Record<string, unknown> }) {
    return ['audio', mergeAttributes({ controls: 'true' }, HTMLAttributes as Record<string, string>)]
  },

  addNodeView() { return ReactNodeViewRenderer(AudioView) },
})

// ── Markdown shortcuts reference ──────────────────────────────────────────────
const MD_SHORTCUTS = [
  { md: '**text**', label: 'Bold' },
  { md: '*text*',   label: 'Italic' },
  { md: '`code`',   label: 'Inline code' },
  { md: '## ',      label: 'Heading 2' },
  { md: '### ',     label: 'Heading 3' },
  { md: '- item',   label: 'Bullet list' },
  { md: '1. item',  label: 'Ordered list' },
  { md: '> quote',  label: 'Blockquote' },
  { md: '``` ',     label: 'Code block' },
  { md: '---',      label: 'Divider' },
]

// ── Minimal markdown → Tiptap JSON converter ─────────────────────────────────
function parseInline(text: string): JSONContent[] {
  const result: JSONContent[] = []
  const regex = /(\*\*[\s\S]+?\*\*|__[\s\S]+?__|`[^`]+`|\*[^*]+?\*|_[^_]+?_)/g
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      result.push({ type: 'text', text: text.slice(lastIndex, match.index) })
    }
    const raw = match[0]
    if (raw.startsWith('**') || raw.startsWith('__')) {
      result.push({ type: 'text', text: raw.slice(2, -2), marks: [{ type: 'bold' }] })
    } else if (raw.startsWith('`')) {
      result.push({ type: 'text', text: raw.slice(1, -1), marks: [{ type: 'code' }] })
    } else {
      result.push({ type: 'text', text: raw.slice(1, -1), marks: [{ type: 'italic' }] })
    }
    lastIndex = match.index + raw.length
  }
  if (lastIndex < text.length) {
    result.push({ type: 'text', text: text.slice(lastIndex) })
  }
  return result.length > 0 ? result : [{ type: 'text', text: '' }]
}

export function markdownToTiptap(md: string): JSONContent {
  const lines = md.split('\n')
  const nodes: JSONContent[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    // Fenced code block
    if (line.startsWith('```')) {
      const lang = line.slice(3).trim()
      const code: string[] = []
      i++
      while (i < lines.length && !lines[i].startsWith('```')) {
        code.push(lines[i]); i++
      }
      nodes.push({
        type: 'codeBlock',
        attrs: { language: lang || null },
        content: [{ type: 'text', text: code.join('\n') }],
      })
      i++; continue
    }

    // Heading
    const hm = line.match(/^(#{1,3})\s+(.+)$/)
    if (hm) {
      nodes.push({
        type: 'heading',
        attrs: { level: hm[1].length as 1 | 2 | 3 },
        content: parseInline(hm[2]),
      })
      i++; continue
    }

    // Blockquote
    if (line.startsWith('> ')) {
      nodes.push({
        type: 'blockquote',
        content: [{ type: 'paragraph', content: parseInline(line.slice(2)) }],
      })
      i++; continue
    }

    // Horizontal rule
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line.trim())) {
      nodes.push({ type: 'horizontalRule' })
      i++; continue
    }

    // Bullet list
    if (/^\s*[-*+] /.test(line)) {
      const items: JSONContent[] = []
      while (i < lines.length && /^\s*[-*+] /.test(lines[i])) {
        const t = lines[i].replace(/^\s*[-*+] /, '')
        items.push({ type: 'listItem', content: [{ type: 'paragraph', content: parseInline(t) }] })
        i++
      }
      nodes.push({ type: 'bulletList', content: items })
      continue
    }

    // Ordered list
    if (/^\s*\d+\. /.test(line)) {
      const items: JSONContent[] = []
      while (i < lines.length && /^\s*\d+\. /.test(lines[i])) {
        const t = lines[i].replace(/^\s*\d+\. /, '')
        items.push({ type: 'listItem', content: [{ type: 'paragraph', content: parseInline(t) }] })
        i++
      }
      nodes.push({ type: 'orderedList', content: items })
      continue
    }

    // Blank line
    if (line.trim() === '') { i++; continue }

    // Regular paragraph
    nodes.push({ type: 'paragraph', content: parseInline(line) })
    i++
  }

  return { type: 'doc', content: nodes.length > 0 ? nodes : [{ type: 'paragraph' }] }
}

// ── Component ─────────────────────────────────────────────────────────────────
interface NoteEditorRichProps {
  content: string | null
  onChange: (content: string) => void
  className?: string
}

export function NoteEditorRich({ content, onChange, className }: NoteEditorRichProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const helpBtnRef  = useRef<HTMLButtonElement>(null)

  // Hyperlink
  const [linkMode,  setLinkMode]  = useState(false)
  const [linkValue, setLinkValue] = useState('')

  // Help dropdown (fixed position)
  const [showHelp, setShowHelp] = useState(false)
  const [helpPos,  setHelpPos]  = useState<{ top: number; right: number } | null>(null)

  // Paste-markdown mode
  const [mdMode, setMdMode] = useState(false)
  const [mdText, setMdText] = useState('')

  // Toolbar expand
  const [toolbarExpanded, setToolbarExpanded] = useState(false)

  // Voice recording
  const [recording,   setRecording]   = useState(false)
  const [recSeconds,  setRecSeconds]  = useState(0)
  const mediaRecorderRef    = useRef<MediaRecorder | null>(null)
  const recordingChunksRef  = useRef<Blob[]>([])
  const recTimerRef         = useRef<ReturnType<typeof setInterval> | null>(null)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] }, codeBlock: {}, horizontalRule: {} }),
      Placeholder.configure({ placeholder: 'Write something…' }),
      Link.configure({ openOnClick: false }),
      ImageNode,
      AudioNode,
    ],
    content: content ? JSON.parse(content) : null,
    onUpdate: ({ editor }) => { onChange(JSON.stringify(editor.getJSON())) },
    editorProps: {
      attributes: {
        class: 'tiptap prose prose-sm dark:prose-invert max-w-none focus:outline-none min-h-[100px] p-0',
      },
    },
  })

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recTimerRef.current) clearInterval(recTimerRef.current)
      if (mediaRecorderRef.current?.state === 'recording') {
        mediaRecorderRef.current.stop()
      }
    }
  }, [])

  useEffect(() => {
    if (!editor) return
    const currentContent = JSON.stringify(editor.getJSON())
    const newContent = content || null
    if (newContent && currentContent !== newContent) {
      try { editor.commands.setContent(JSON.parse(newContent), false) } catch {}
    }
  }, [content]) // eslint-disable-line

  // ── Image (file) ──────────────────────────────────────────────────────────
  function insertImage(src: string) {
    if (!editor || !src) return
    // Insert image + empty paragraph so cursor is always placeable after
    editor.chain().focus().insertContent([
      { type: 'image', attrs: { src } },
      { type: 'paragraph' },
    ]).run()
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (evt) => {
      const src = evt.target?.result as string
      if (src) insertImage(src)
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  // ── Hyperlink ─────────────────────────────────────────────────────────────
  function handleLinkToggle() {
    if (!editor) return
    if (editor.isActive('link')) {
      editor.chain().focus().unsetLink().run()
      return
    }
    setLinkMode((v) => !v)
  }

  function handleLinkInsert() {
    if (!editor || !linkValue.trim()) return
    let url = linkValue.trim()
    if (!url.startsWith('http://') && !url.startsWith('https://')) url = `https://${url}`
    editor.chain().focus().setLink({ href: url }).run()
    setLinkValue('')
    setLinkMode(false)
  }

  // ── Paste-markdown mode ───────────────────────────────────────────────────
  function enterMdMode() { setMdText(''); setMdMode(true) }

  function applyMarkdown() {
    if (!editor) return
    editor.commands.setContent(markdownToTiptap(mdText))
    onChange(JSON.stringify(editor.getJSON()))
    setMdMode(false)
    setMdText('')
  }

  // ── Help dropdown (capture button position → fixed overlay) ──────────────
  function handleHelpToggle() {
    if (showHelp) { setShowHelp(false); setHelpPos(null); return }
    const rect = helpBtnRef.current?.getBoundingClientRect()
    if (rect) setHelpPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right })
    setShowHelp(true)
  }

  // ── Voice recording ───────────────────────────────────────────────────────
  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mr = new MediaRecorder(stream)
      recordingChunksRef.current = []

      mr.ondataavailable = (e) => {
        if (e.data.size > 0) recordingChunksRef.current.push(e.data)
      }

      mr.onstop = () => {
        stream.getTracks().forEach((t) => t.stop())
        const blob = new Blob(recordingChunksRef.current, { type: 'audio/webm' })
        const reader = new FileReader()
        reader.onload = (evt) => {
          const src = evt.target?.result as string
          if (src && editor) {
            // Insert audio + empty paragraph so cursor is always placeable after
            editor.chain().focus().insertContent([
              { type: 'audio', attrs: { src } },
              { type: 'paragraph' },
            ]).run()
          }
        }
        reader.readAsDataURL(blob)
        if (recTimerRef.current) clearInterval(recTimerRef.current)
        setRecording(false)
        setRecSeconds(0)
      }

      mr.start()
      mediaRecorderRef.current = mr
      setRecording(true)
      setRecSeconds(0)
      recTimerRef.current = setInterval(() => setRecSeconds((s) => s + 1), 1000)
    } catch {
      // Microphone not available or denied
    }
  }

  function stopRecording() { mediaRecorderRef.current?.stop() }

  const formatTime = (s: number) =>
    `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

  if (!editor) return null

  return (
    <div className={cn('space-y-2', className)}>
      {/* ── Formatting toolbar ─────────────────────────────────────────── */}
      <div className="border-b pb-2 space-y-0.5">

        {/* Primary row — always visible */}
        <div className="flex items-center gap-0.5">
          <ToolbarButton
            active={editor.isActive('bold')}
            onClick={() => editor.chain().focus().toggleBold().run()}
            title="Bold (Ctrl+B)"
          >
            <Bold className="h-3.5 w-3.5" />
          </ToolbarButton>

          <ToolbarButton
            active={editor.isActive('italic')}
            onClick={() => editor.chain().focus().toggleItalic().run()}
            title="Italic (Ctrl+I)"
          >
            <Italic className="h-3.5 w-3.5" />
          </ToolbarButton>

          <ToolbarButton
            active={editor.isActive('heading', { level: 2 })}
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            title="Heading 2 (## )"
          >
            <Heading2 className="h-3.5 w-3.5" />
          </ToolbarButton>

          <ToolbarButton
            active={editor.isActive('heading', { level: 3 })}
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            title="Heading 3 (### )"
          >
            <Heading3 className="h-3.5 w-3.5" />
          </ToolbarButton>

          <ToolbarButton
            active={editor.isActive('codeBlock')}
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            title="Code block (``` )"
          >
            <Code className="h-3.5 w-3.5" />
          </ToolbarButton>

          <ToolbarButton
            active={false}
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
            title="Divider (---)"
          >
            <Minus className="h-3.5 w-3.5" />
          </ToolbarButton>

          {/* Image: pick file */}
          <ToolbarButton
            active={false}
            onClick={() => fileInputRef.current?.click()}
            title="Insert image from file"
          >
            <ImagePlus className="h-3.5 w-3.5" />
          </ToolbarButton>

          {/* Hyperlink */}
          <ToolbarButton
            active={editor.isActive('link') || linkMode}
            onClick={handleLinkToggle}
            title={editor.isActive('link') ? 'Remove link' : 'Insert link'}
          >
            <Link2 className="h-3.5 w-3.5" />
          </ToolbarButton>

          {/* Voice memo / recording indicator */}
          {recording ? (
            <button
              type="button"
              onClick={stopRecording}
              title="Stop recording"
              className="flex items-center gap-1.5 px-2 py-1 rounded text-xs bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
              </span>
              {formatTime(recSeconds)}
              <Square className="h-3 w-3 ml-0.5" />
            </button>
          ) : (
            <ToolbarButton
              active={false}
              onClick={startRecording}
              title="Record voice memo"
            >
              <Mic className="h-3.5 w-3.5" />
            </ToolbarButton>
          )}

          {/* Expand toggle — last button on left side, before spacer */}
          <button
            type="button"
            onClick={() => setToolbarExpanded((v) => !v)}
            title={toolbarExpanded ? 'Hide extra options' : 'More formatting options'}
            className={cn(
              'p-1.5 rounded text-sm transition-colors',
              toolbarExpanded
                ? 'bg-accent text-accent-foreground'
                : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
            )}
          >
            <ChevronDown className={cn('h-3.5 w-3.5 transition-transform duration-150', toolbarExpanded && 'rotate-180')} />
          </button>

          {/* ── Spacer → push right-side buttons ── */}
          <div className="flex-1" />

          {/* Paste markdown */}
          <ToolbarButton
            active={mdMode}
            onClick={() => mdMode ? setMdMode(false) : enterMdMode()}
            title="Paste raw markdown"
          >
            <FileCode2 className="h-3.5 w-3.5" />
          </ToolbarButton>

          {/* Markdown help — fixed-position dropdown */}
          <button
            ref={helpBtnRef}
            onClick={handleHelpToggle}
            type="button"
            title="Markdown shortcuts"
            className={cn(
              'p-1.5 rounded text-sm transition-colors',
              showHelp
                ? 'bg-accent text-accent-foreground'
                : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
            )}
          >
            <HelpCircle className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Secondary row — expandable (lists + blockquote) */}
        {toolbarExpanded && (
          <div className="flex items-center gap-0.5 pt-0.5">
            <ToolbarButton
              active={editor.isActive('bulletList')}
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              title="Bullet list (- )"
            >
              <List className="h-3.5 w-3.5" />
            </ToolbarButton>

            <ToolbarButton
              active={editor.isActive('orderedList')}
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              title="Ordered list (1. )"
            >
              <ListOrdered className="h-3.5 w-3.5" />
            </ToolbarButton>

            <ToolbarButton
              active={editor.isActive('blockquote')}
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
              title="Blockquote (> )"
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="currentColor">
                <path d="M3 4h2L3 8h2L3 12H1L3 8H1L3 4zm6 0h2L9 8h2L9 12H7L9 8H7L9 4z"/>
              </svg>
            </ToolbarButton>
          </div>
        )}
      </div>

      {/* Hidden file input for image upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* ── Link input ────────────────────────────────────────────────── */}
      {linkMode && (
        <div className="flex gap-1.5">
          <input
            type="url"
            value={linkValue}
            onChange={(e) => setLinkValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); handleLinkInsert() }
              if (e.key === 'Escape') { setLinkMode(false); setLinkValue('') }
            }}
            placeholder="https://example.com"
            className={cn(
              'flex-1 text-sm rounded-md px-2.5 py-1.5 bg-background',
              'border border-input focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1',
            )}
            autoFocus
          />
          <button
            onClick={handleLinkInsert}
            className="px-3 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Insert
          </button>
          <button
            onClick={() => { setLinkMode(false); setLinkValue('') }}
            className="px-2 text-sm rounded-md hover:bg-accent transition-colors text-muted-foreground"
          >
            ✕
          </button>
        </div>
      )}

      {/* ── Paste-markdown textarea ───────────────────────────────────── */}
      {mdMode ? (
        <div className="space-y-2">
          <textarea
            value={mdText}
            onChange={(e) => setMdText(e.target.value)}
            placeholder={'Paste your markdown here…\n\n# Heading\n**bold** *italic* `code`\n- item 1\n- item 2'}
            className={cn(
              'w-full min-h-[120px] rounded-md border border-input bg-background',
              'px-3 py-2 text-sm font-mono leading-relaxed resize-y',
              'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1',
              'placeholder:text-muted-foreground/50',
            )}
            autoFocus
          />
          <div className="flex gap-2">
            <button
              onClick={applyMarkdown}
              disabled={!mdText.trim()}
              className="px-3 py-1.5 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              Convert to rich text
            </button>
            <button
              onClick={() => { setMdMode(false); setMdText('') }}
              className="px-3 py-1.5 text-sm rounded-md hover:bg-accent transition-colors text-muted-foreground"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <EditorContent editor={editor} />
      )}

      {/* ── Markdown help overlay (fixed to viewport, no scroll impact) ── */}
      {showHelp && (
        <>
          {/* Click-outside backdrop */}
          <div
            className="fixed inset-0 z-[998]"
            onClick={() => { setShowHelp(false); setHelpPos(null) }}
          />
          {helpPos && (
            <div
              style={{
                position: 'fixed',
                top:   `${helpPos.top}px`,
                right: `${helpPos.right}px`,
                zIndex: 999,
              }}
              className="w-64 rounded-xl border bg-popover shadow-lg p-3 space-y-1 text-sm"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-xs uppercase tracking-wide text-muted-foreground">
                  Markdown shortcuts
                </span>
                <button
                  onClick={() => { setShowHelp(false); setHelpPos(null) }}
                  className="p-0.5 rounded hover:bg-accent"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
              {MD_SHORTCUTS.map(({ md, label }) => (
                <div key={md} className="flex items-center justify-between gap-3 py-0.5">
                  <span className="text-muted-foreground text-xs">{label}</span>
                  <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono shrink-0">{md}</code>
                </div>
              ))}
              <p className="text-[10px] text-muted-foreground pt-1 border-t">
                Type these shortcuts directly while writing
              </p>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ── Toolbar button ────────────────────────────────────────────────────────────
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
      type="button"
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
