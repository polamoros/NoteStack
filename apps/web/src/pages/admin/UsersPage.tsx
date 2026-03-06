import { trpc } from '@/api/client'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Shield, ShieldOff, UserX, UserCheck, Pencil, KeyRound, X, Check, UserPlus } from 'lucide-react'
import { authClient } from '@/lib/auth-client'
import { useState } from 'react'
import { cn } from '@/lib/utils'

// ── Inline edit row ───────────────────────────────────────────────────────────
function EditUserRow({
  user,
  onClose,
}: {
  user: { id: string; name: string; email: string }
  onClose: () => void
}) {
  const qc = useQueryClient()
  const [name, setName]   = useState(user.name)
  const [email, setEmail] = useState(user.email)
  const [err, setErr]     = useState('')

  const updateUser = trpc.admin.users.updateUser.useMutation({
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [['admin', 'users']] })
      onClose()
    },
    onError: (e) => setErr(e.message),
  })

  return (
    <tr className="bg-muted/30">
      <td className="px-4 py-2" colSpan={4}>
        <div className="flex items-center gap-2 flex-wrap">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Display name"
            className={cn(
              'text-sm px-2.5 py-1.5 rounded-md border border-input bg-background',
              'focus:outline-none focus:ring-2 focus:ring-ring w-44',
            )}
          />
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            type="email"
            className={cn(
              'text-sm px-2.5 py-1.5 rounded-md border border-input bg-background',
              'focus:outline-none focus:ring-2 focus:ring-ring w-56',
            )}
          />
          {err && <p className="text-xs text-destructive">{err}</p>}
          <Button
            size="sm"
            onClick={() => updateUser.mutate({ userId: user.id, name: name || undefined, email: email || undefined })}
            disabled={updateUser.isPending}
          >
            <Check className="h-3.5 w-3.5 mr-1" />
            {updateUser.isPending ? 'Saving…' : 'Save'}
          </Button>
          <Button size="sm" variant="ghost" onClick={onClose}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </td>
    </tr>
  )
}

// ── Password row ──────────────────────────────────────────────────────────────
function SetPasswordRow({
  userId,
  onClose,
}: {
  userId: string
  onClose: () => void
}) {
  const [pw, setPw]   = useState('')
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')

  const setPassword = trpc.admin.users.setUserPassword.useMutation({
    onSuccess: () => {
      setMsg('Password updated')
      setTimeout(onClose, 1500)
    },
    onError: (e) => setErr(e.message),
  })

  return (
    <tr className="bg-muted/30">
      <td className="px-4 py-2" colSpan={4}>
        <div className="flex items-center gap-2 flex-wrap">
          <input
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            type="password"
            placeholder="New password (min 8 chars)"
            className={cn(
              'text-sm px-2.5 py-1.5 rounded-md border border-input bg-background',
              'focus:outline-none focus:ring-2 focus:ring-ring w-56',
            )}
          />
          {err && <p className="text-xs text-destructive">{err}</p>}
          {msg && <p className="text-xs text-green-600 dark:text-green-400">{msg}</p>}
          <Button
            size="sm"
            onClick={() => { setErr(''); setPassword.mutate({ userId, newPassword: pw }) }}
            disabled={setPassword.isPending || pw.length < 8}
          >
            <Check className="h-3.5 w-3.5 mr-1" />
            {setPassword.isPending ? 'Setting…' : 'Set password'}
          </Button>
          <Button size="sm" variant="ghost" onClick={onClose}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </td>
    </tr>
  )
}

// ── Create user dialog ────────────────────────────────────────────────────────
function CreateUserDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient()
  const [name, setName]         = useState('')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole]         = useState<'user' | 'admin'>('user')
  const [err, setErr]           = useState('')

  const createUser = trpc.admin.users.createUser.useMutation({
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [['admin', 'users']] })
      setName(''); setEmail(''); setPassword(''); setRole('user'); setErr('')
      onClose()
    },
    onError: (e) => setErr(e.message),
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErr('')
    createUser.mutate({ name, email, password, role })
  }

  function handleOpenChange(open: boolean) {
    if (!open) { setName(''); setEmail(''); setPassword(''); setRole('user'); setErr(''); onClose() }
  }

  const inputCls = cn(
    'w-full text-sm px-2.5 py-1.5 rounded-md border border-input bg-background',
    'focus:outline-none focus:ring-2 focus:ring-ring',
  )

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create User</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3 py-2">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full name"
              required
              className={inputCls}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Email</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@example.com"
              type="email"
              required
              className={inputCls}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Password</label>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 8 characters"
              type="password"
              required
              minLength={8}
              className={inputCls}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as 'user' | 'admin')}
              className={inputCls}
            >
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          {err && <p className="text-xs text-destructive">{err}</p>}
          <DialogFooter className="pt-2">
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={createUser.isPending}>
              {createUser.isPending ? 'Creating…' : 'Create user'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export function AdminUsersPage() {
  const qc = useQueryClient()
  const { data: session } = authClient.useSession()
  const { data, isLoading } = trpc.admin.users.list.useQuery({})
  const users = data?.users ?? []

  const [editingId, setEditingId]     = useState<string | null>(null)
  const [passwordId, setPasswordId]   = useState<string | null>(null)
  const [createOpen, setCreateOpen]   = useState(false)

  function invalidate() {
    qc.invalidateQueries({ queryKey: [['admin', 'users']] })
  }

  const setRole   = trpc.admin.users.setRole.useMutation({ onSuccess: invalidate })
  const setBanned = trpc.admin.users.setBanned.useMutation({ onSuccess: invalidate })
  const deleteUser = trpc.admin.users.delete.useMutation({ onSuccess: invalidate })

  return (
    <div className="max-w-3xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Users</h1>
        <Button onClick={() => setCreateOpen(true)} size="sm">
          <UserPlus className="h-4 w-4 mr-1.5" />
          Create user
        </Button>
      </div>

      <CreateUserDialog open={createOpen} onClose={() => setCreateOpen(false)} />

      {isLoading && <p className="text-muted-foreground">Loading…</p>}

      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-4 py-3 font-medium">User</th>
              <th className="text-left px-4 py-3 font-medium">Role</th>
              <th className="text-left px-4 py-3 font-medium">Status</th>
              <th className="text-right px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {users.map((user) => {
              const isSelf = user.id === session?.user.id
              const isEditing   = editingId === user.id
              const isSetPw     = passwordId === user.id
              return (
                <>
                  <tr key={user.id} className="hover:bg-muted/20">
                    <td className="px-4 py-3">
                      <p className="font-medium">{user.name}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                        {user.role ?? 'user'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      {user.banned ? (
                        <Badge variant="destructive">Banned</Badge>
                      ) : (
                        <Badge variant="outline" className="text-green-600 border-green-600">
                          Active
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {!isSelf && (
                          <>
                            {/* Edit name/email */}
                            <Button
                              size="icon-sm"
                              variant="ghost"
                              title="Edit name/email"
                              onClick={() => { setEditingId(isEditing ? null : user.id); setPasswordId(null) }}
                            >
                              <Pencil className={cn('h-4 w-4', isEditing && 'text-primary')} />
                            </Button>
                            {/* Set password */}
                            <Button
                              size="icon-sm"
                              variant="ghost"
                              title="Set password"
                              onClick={() => { setPasswordId(isSetPw ? null : user.id); setEditingId(null) }}
                            >
                              <KeyRound className={cn('h-4 w-4', isSetPw && 'text-primary')} />
                            </Button>
                            <Button
                              size="icon-sm"
                              variant="ghost"
                              title={user.role === 'admin' ? 'Remove admin' : 'Make admin'}
                              onClick={() =>
                                setRole.mutate({
                                  userId: user.id,
                                  role: user.role === 'admin' ? 'user' : 'admin',
                                })
                              }
                            >
                              {user.role === 'admin' ? (
                                <ShieldOff className="h-4 w-4" />
                              ) : (
                                <Shield className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              size="icon-sm"
                              variant="ghost"
                              title={user.banned ? 'Unban' : 'Ban'}
                              onClick={() =>
                                setBanned.mutate({ userId: user.id, banned: !user.banned })
                              }
                            >
                              {user.banned ? (
                                <UserCheck className="h-4 w-4 text-green-600" />
                              ) : (
                                <UserX className="h-4 w-4 text-orange-500" />
                              )}
                            </Button>
                            <Button
                              size="icon-sm"
                              variant="ghost"
                              title="Delete user"
                              onClick={() => {
                                if (confirm(`Delete ${user.name}? This cannot be undone.`)) {
                                  deleteUser.mutate({ userId: user.id })
                                }
                              }}
                            >
                              <UserX className="h-4 w-4 text-destructive" />
                            </Button>
                          </>
                        )}
                        {isSelf && <span className="text-xs text-muted-foreground">You</span>}
                      </div>
                    </td>
                  </tr>
                  {isEditing && (
                    <EditUserRow
                      user={user}
                      onClose={() => setEditingId(null)}
                    />
                  )}
                  {isSetPw && (
                    <SetPasswordRow
                      userId={user.id}
                      onClose={() => setPasswordId(null)}
                    />
                  )}
                </>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
