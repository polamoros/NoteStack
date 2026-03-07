import {
  useEditor, EditorContent, Node, mergeAttributes,
  ReactNodeViewRenderer, NodeViewWrapper,
} from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Link from '@tiptap/extension-link'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  Bold, Italic, List, ListOrdered, Heading2, Heading3,
  Code, Minus, ImagePlus, Link2, HelpCircle, FileCode2, Mic, Square,
  ChevronDown, Strikethrough, Quote,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { JSONContent, Editor } from '@tiptap/react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

// ── Image node view with hover controls (resize + alignment) via portal ───────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ImageView({ node, updateAttributes, selected }: any) {
  const { src, alt, width, align } = node.attrs as {
    src: string; alt: string | null; width: string | null; align: string | null
  }
  const [hovered, setHovered] = useState(false)
  const [imgRect, setImgRect] = useState<DOMRect | null>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const showControls = hovered || selected

  // Use a ref so the scroll handler always has the latest callback
  const refreshRectRef = useRef<() => void>(() => {})
  refreshRectRef.current = () => {
    if (wrapperRef.current) setImgRect(wrapperRef.current.getBoundingClientRect())
  }

  function handleMouseEnter() {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
    setHovered(true)
    refreshRectRef.current()
  }
  function handleMouseLeave() {
    hideTimerRef.current = setTimeout(() => setHovered(false), 200)
  }

  // Keep the portal controls in sync with image position on scroll / resize
  useEffect(() => {
    if (!showControls) { setImgRect(null); return }
    refreshRectRef.current()
    const handler = () => refreshRectRef.current()
    window.addEventListener('scroll', handler, { passive: true, capture: true })
    window.addEventListener('resize', handler, { passive: true })
    return () => {
      window.removeEventListener('scroll', handler, true)
      window.removeEventListener('resize', handler)
    }
  }, [showControls])

  const alignStyle: React.CSSProperties =
    align === 'left'   ? { marginRight: 'auto', marginLeft: 0 } :
    align === 'right'  ? { marginLeft: 'auto', marginRight: 0 } :
    align === 'center' ? { marginLeft: 'auto', marginRight: 'auto' } :
    {}

  // Portal: render controls fixed above the image bottom — escapes any overflow:hidden container
  const controlsPortal = (showControls && imgRect) ? createPortal(
    <div
      className="flex items-center gap-1 pointer-events-auto"
      style={{
        position: 'fixed',
        top: `${Math.max(8, imgRect.bottom - 50)}px`,
        left: `${imgRect.left + imgRect.width / 2}px`,
        transform: 'translateX(-50%)',
        zIndex: 9999,
        whiteSpace: 'nowrap',
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="flex gap-0.5 bg-black/75 backdrop-blur-sm rounded-full px-2 py-1 shadow-lg">
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
      <div className="flex gap-0.5 bg-black/75 backdrop-blur-sm rounded-full px-2 py-1 shadow-lg">
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
    </div>,
    document.body,
  ) : null

  return (
    <NodeViewWrapper>
      <div
        ref={wrapperRef}
        className="my-2"
        style={{ width: width ?? '100%', maxWidth: '100%', ...alignStyle }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <img
          src={src}
          alt={alt ?? ''}
          draggable={false}
          className={cn(
            'rounded-lg block max-w-full w-full transition-all',
            selected
              ? 'ring-2 ring-primary shadow-[0_0_0_3px_hsl(var(--primary)/0.25)]'
              : 'hover:ring-1 hover:ring-primary/30',
          )}
        />
      </div>
      {controlsPortal}
    </NodeViewWrapper>
  )
}

// ── Audio node view ───────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function AudioView({ node, selected }: any) {
  return (
    <NodeViewWrapper>
      <div className={cn('my-2 rounded-lg transition-all', selected && 'ring-2 ring-primary shadow-[0_0_0_3px_hsl(var(--primary)/0.25)]')}>
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

// ── Markdown shortcuts — label, example, and click-to-insert command ──────────
const MD_SHORTCUTS: { md: string; label: string; run: (e: Editor) => void }[] = [
  { md: '**text**',  label: 'Bold',         run: (e) => e.chain().focus().toggleBold().run() },
  { md: '*text*',    label: 'Italic',       run: (e) => e.chain().focus().toggleItalic().run() },
  { md: '~~text~~',  label: 'Strikethrough',run: (e) => e.chain().focus().toggleStrike().run() },
  { md: '`code`',    label: 'Inline code',  run: (e) => e.chain().focus().toggleCode().run() },
  { md: '# ',        label: 'Heading 1',    run: (e) => e.chain().focus().toggleHeading({ level: 1 }).run() },
  { md: '## ',       label: 'Heading 2',    run: (e) => e.chain().focus().toggleHeading({ level: 2 }).run() },
  { md: '### ',      label: 'Heading 3',    run: (e) => e.chain().focus().toggleHeading({ level: 3 }).run() },
  { md: '- item',    label: 'Bullet list',  run: (e) => e.chain().focus().toggleBulletList().run() },
  { md: '1. item',   label: 'Ordered list', run: (e) => e.chain().focus().toggleOrderedList().run() },
  { md: '> quote',   label: 'Blockquote',   run: (e) => e.chain().focus().toggleBlockquote().run() },
  { md: '``` ',      label: 'Code block',   run: (e) => e.chain().focus().toggleCodeBlock().run() },
  { md: '---',       label: 'Divider',      run: (e) => e.chain().focus().setHorizontalRule().run() },
]

// ── Minimal markdown → Tiptap JSON converter ─────────────────────────────────
function parseInline(text: string): JSONContent[] {
  const result: JSONContent[] = []
  // Matches: [text](url)  **bold**  __bold__  `code`  *italic*  _italic_
  const regex = /(\[([^\]]+)\]\(([^)]+)\)|\*\*[\s\S]+?\*\*|__[\s\S]+?__|`[^`]+`|\*[^*]+?\*|_[^_]+?_)/g
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      result.push({ type: 'text', text: text.slice(lastIndex, match.index) })
    }
    const raw = match[0]
    if (raw.startsWith('[')) {
      // [label](url) link
      const lm = raw.match(/^\[([^\]]+)\]\(([^)]+)\)$/)
      if (lm) {
        result.push({ type: 'text', text: lm[1], marks: [{ type: 'link', attrs: { href: lm[2] } }] })
      } else {
        result.push({ type: 'text', text: raw })
      }
    } else if (raw.startsWith('**') || raw.startsWith('__')) {
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

  // Hyperlink
  const [linkMode,  setLinkMode]  = useState(false)
  const [linkValue, setLinkValue] = useState('')

  // Secondary toolbar row
  const [toolbarExpanded, setToolbarExpanded] = useState(false)

  // Paste-markdown mode
  const [mdMode, setMdMode] = useState(false)
  const [mdText, setMdText] = useState('')

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
    const { from, to } = editor.state.selection
    if (from === to) {
      // No text selected — insert URL as a link
      editor.chain().focus().insertContent({
        type: 'text',
        text: url,
        marks: [{ type: 'link', attrs: { href: url } }],
      }).run()
    } else {
      editor.chain().focus().setLink({ href: url }).run()
    }
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

          {/* Expand secondary row */}
          <ToolbarButton
            active={toolbarExpanded}
            onClick={() => setToolbarExpanded((v) => !v)}
            title="More formatting options"
          >
            <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', toolbarExpanded && 'rotate-180')} />
          </ToolbarButton>

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

          {/* Markdown shortcuts — Radix Popover handles dialog layering correctly */}
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                title="Markdown shortcuts"
                className="p-1.5 rounded text-sm transition-colors text-muted-foreground hover:bg-black/[0.07] dark:hover:bg-white/[0.08] hover:text-foreground"
              >
                <HelpCircle className="h-3.5 w-3.5" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-60 p-3" align="end" side="bottom">
              <p className="font-semibold text-xs uppercase tracking-wide text-muted-foreground mb-2">
                Markdown shortcuts
              </p>
              <div className="space-y-0.5">
                {MD_SHORTCUTS.map(({ md, label, run }) => (
                  <button
                    key={md}
                    type="button"
                    className="w-full flex items-center justify-between gap-3 py-1 px-1.5 rounded hover:bg-black/[0.06] dark:hover:bg-white/[0.06] transition-colors text-left cursor-pointer"
                    onClick={() => { run(editor); }}
                  >
                    <span className="text-muted-foreground text-xs">{label}</span>
                    <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono shrink-0 text-foreground/80">{md}</code>
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground pt-2 mt-1 border-t">
                Click to insert · or type directly while writing
              </p>
            </PopoverContent>
          </Popover>
        </div>

        {/* Secondary row — list/blockquote/strikethrough */}
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
              <Quote className="h-3.5 w-3.5" />
            </ToolbarButton>

            <ToolbarButton
              active={editor.isActive('strike')}
              onClick={() => editor.chain().focus().toggleStrike().run()}
              title="Strikethrough"
            >
              <Strikethrough className="h-3.5 w-3.5" />
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
            className="px-2 text-sm rounded-md hover:bg-black/[0.07] dark:hover:bg-white/[0.08] transition-colors text-muted-foreground"
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
              className="px-3 py-1.5 text-sm rounded-md hover:bg-black/[0.07] dark:hover:bg-white/[0.08] transition-colors text-muted-foreground"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <EditorContent editor={editor} />
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
          ? 'bg-black/[0.12] dark:bg-white/[0.15] text-foreground'
          : 'text-muted-foreground hover:bg-black/[0.07] dark:hover:bg-white/[0.08] hover:text-foreground',
      )}
    >
      {children}
    </button>
  )
}
