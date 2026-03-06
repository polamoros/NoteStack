import { useState } from 'react'
import { trpc } from '@/api/client'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Plus, Trash2, Pencil, X } from 'lucide-react'

interface ProviderFormData {
  name: string
  issuerUrl: string
  clientId: string
  clientSecret: string
  scopes: string
  enabled: boolean
}

const DEFAULT_FORM: ProviderFormData = {
  name: '',
  issuerUrl: '',
  clientId: '',
  clientSecret: '',
  scopes: 'openid email profile',
  enabled: true,
}

export function AdminAuthConfigPage() {
  const qc = useQueryClient()
  const { data: providers = [] } = trpc.admin.authConfig.list.useQuery()
  const [form, setForm] = useState<ProviderFormData>(DEFAULT_FORM)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)

  function invalidate() {
    qc.invalidateQueries({ queryKey: [['admin', 'authConfig']] })
  }

  const create = trpc.admin.authConfig.create.useMutation({
    onSuccess: () => { invalidate(); setShowForm(false); setForm(DEFAULT_FORM) },
  })
  const update = trpc.admin.authConfig.update.useMutation({
    onSuccess: () => { invalidate(); setEditingId(null); setShowForm(false); setForm(DEFAULT_FORM) },
  })
  const del = trpc.admin.authConfig.delete.useMutation({ onSuccess: invalidate })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (editingId) {
      update.mutate({ id: editingId, ...form })
    } else {
      create.mutate(form)
    }
  }

  function startEdit(provider: typeof providers[0]) {
    setEditingId(provider.id)
    setForm({
      name: provider.name,
      issuerUrl: provider.issuerUrl,
      clientId: provider.clientId,
      clientSecret: '', // don't prefill secret
      scopes: provider.scopes,
      enabled: provider.enabled,
    })
    setShowForm(true)
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Auth / OIDC</h1>
        {!showForm && (
          <Button size="sm" onClick={() => { setShowForm(true); setEditingId(null); setForm(DEFAULT_FORM) }}>
            <Plus className="h-4 w-4 mr-1" />
            Add Provider
          </Button>
        )}
      </div>

      {/* Provider form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="rounded-lg border p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-medium">{editingId ? 'Edit Provider' : 'New OIDC Provider'}</h2>
            <button type="button" onClick={() => setShowForm(false)}>
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Display name</Label>
              <Input
                placeholder="Google, Authentik…"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Issuer URL</Label>
              <Input
                placeholder="https://accounts.google.com"
                value={form.issuerUrl}
                onChange={(e) => setForm({ ...form, issuerUrl: e.target.value })}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Client ID</Label>
              <Input
                value={form.clientId}
                onChange={(e) => setForm({ ...form, clientId: e.target.value })}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Client Secret {editingId && <span className="text-xs text-muted-foreground">(leave blank to keep current)</span>}</Label>
              <Input
                type="password"
                value={form.clientSecret}
                onChange={(e) => setForm({ ...form, clientSecret: e.target.value })}
                required={!editingId}
              />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Scopes</Label>
              <Input
                value={form.scopes}
                onChange={(e) => setForm({ ...form, scopes: e.target.value })}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Switch
              checked={form.enabled}
              onCheckedChange={(checked) => setForm({ ...form, enabled: checked })}
            />
            <Label>Enabled (show on login page)</Label>
          </div>

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button type="submit" disabled={create.isPending || update.isPending}>
              {editingId ? 'Update' : 'Add Provider'}
            </Button>
          </div>
        </form>
      )}

      {/* Provider list */}
      <div className="space-y-2">
        {providers.length === 0 && !showForm && (
          <p className="text-muted-foreground text-sm">No OIDC providers configured. Add one above.</p>
        )}
        {providers.map((provider) => (
          <div key={provider.id} className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <div className="flex items-center gap-2">
                <p className="font-medium">{provider.name}</p>
                <Badge variant={provider.enabled ? 'default' : 'secondary'}>
                  {provider.enabled ? 'Enabled' : 'Disabled'}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">{provider.issuerUrl}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button size="icon-sm" variant="ghost" onClick={() => startEdit(provider)}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                size="icon-sm"
                variant="ghost"
                onClick={() => { if (confirm('Delete this provider?')) del.mutate({ id: provider.id }) }}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
