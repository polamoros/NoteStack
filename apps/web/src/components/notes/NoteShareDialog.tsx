import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { trpc } from '@/api/client'
import { useQueryClient } from '@tanstack/react-query'
import { Link2, Link2Off, Copy, Check, Trash2, UserPlus } from 'lucide-react'
import type { Note } from '@notes/shared'
import { cn } from '@/lib/utils'
import { useToast } from '@/hooks/useToast'

interface NoteShareDialogProps {
  note: Note
  open: boolean
  onOpenChange: (open: boolean) => void
}

function getPublicNoteUrl(token: string) {
  return `${window.location.origin}/share/${token}`
}

export function NoteShareDialog({ note, open, onOpenChange }: NoteShareDialogProps) {
  const qc = useQueryClient()
  const { toast } = useToast()

  const [email, setEmail] = useState('')
  const [permission, setPermission] = useState<'VIEW' | 'EDIT'>('VIEW')
  const [copied, setCopied] = useState(false)

  const { data, isLoading } = trpc.sharing.listShares.useQuery(
    { noteId: note.id },
    { enabled: open },
  )

  const shares = data?.shares ?? []
  const publicToken = data?.publicShareToken ?? note.publicShareToken ?? null

  function invalidate() {
    qc.invalidateQueries({ queryKey: [['sharing', 'listShares']] })
    qc.invalidateQueries({ queryKey: [['notes']] })
  }

  const createPublic = trpc.sharing.createPublicShare.useMutation({ onSuccess: invalidate })
  const removePublic = trpc.sharing.removePublicShare.useMutation({ onSuccess: invalidate })
  const shareWithUser = trpc.sharing.shareWithUser.useMutation({
    onSuccess: () => { invalidate(); setEmail('') },
    onError: (err) => toast({ title: err.message, variant: 'destructive' }),
  })
  const removeShare = trpc.sharing.removeUserShare.useMutation({ onSuccess: invalidate })

  async function copyLink() {
    if (!publicToken) return
    await navigator.clipboard.writeText(getPublicNoteUrl(publicToken))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleAddShare() {
    if (!email.trim()) return
    shareWithUser.mutate({ noteId: note.id, email: email.trim(), permission })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm" onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle>Share note</DialogTitle>
        </DialogHeader>

        {/* ── Public link ─────────────────────────────────────────────────── */}
        <div className="rounded-lg border p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Link2 className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Public link</span>
            </div>
            <Button
              variant={publicToken ? 'default' : 'outline'}
              size="sm"
              onClick={() =>
                publicToken
                  ? removePublic.mutate({ noteId: note.id })
                  : createPublic.mutate({ noteId: note.id })
              }
              disabled={createPublic.isPending || removePublic.isPending}
            >
              {publicToken ? (
                <><Link2Off className="h-3.5 w-3.5 mr-1.5" />Disable</>
              ) : (
                <><Link2 className="h-3.5 w-3.5 mr-1.5" />Enable</>
              )}
            </Button>
          </div>

          {publicToken && (
            <div className="flex items-center gap-2">
              <Input
                value={getPublicNoteUrl(publicToken)}
                readOnly
                className="h-7 text-xs font-mono truncate"
              />
              <Button variant="ghost" size="sm" className="shrink-0 px-2" onClick={copyLink}>
                {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
              </Button>
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            Anyone with the link can view this note (read-only).
          </p>
        </div>

        {/* ── Share with user ──────────────────────────────────────────────── */}
        <div className="space-y-2">
          <p className="text-sm font-medium">Share with a person</p>
          <div className="flex gap-2">
            <Input
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleAddShare() }}
              className="flex-1 h-8 text-sm"
            />
            <select
              value={permission}
              onChange={(e) => setPermission(e.target.value as 'VIEW' | 'EDIT')}
              className="h-8 text-sm border rounded px-2 bg-background"
            >
              <option value="VIEW">View</option>
              <option value="EDIT">Edit</option>
            </select>
            <Button
              size="sm"
              className="shrink-0"
              onClick={handleAddShare}
              disabled={!email.trim() || shareWithUser.isPending}
            >
              <UserPlus className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* ── Current shares ───────────────────────────────────────────────── */}
        {!isLoading && shares.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Shared with</p>
            {shares.map((share) => (
              <div key={share.id} className="flex items-center gap-2 group py-1">
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{share.sharedWithEmail}</p>
                  {share.sharedWithName && (
                    <p className="text-xs text-muted-foreground truncate">{share.sharedWithName}</p>
                  )}
                </div>
                <span
                  className={cn(
                    'text-xs px-1.5 py-0.5 rounded font-medium shrink-0',
                    share.permission === 'EDIT'
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                      : 'bg-muted text-muted-foreground',
                  )}
                >
                  {share.permission === 'EDIT' ? 'Edit' : 'View'}
                </span>
                <button
                  onClick={() => removeShare.mutate({ shareId: share.id })}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                  title="Remove access"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
