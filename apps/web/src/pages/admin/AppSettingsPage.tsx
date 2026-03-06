import { useState, useEffect } from 'react'
import { trpc } from '@/api/client'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'

export function AdminAppSettingsPage() {
  const qc = useQueryClient()
  const { data: settings } = trpc.settings.getPublic.useQuery()
  const update = trpc.admin.settings.update.useMutation({
    onSuccess: () => qc.invalidateQueries({ queryKey: [['settings']] }),
  })

  const [instanceName, setInstanceName] = useState('')
  const [logoUrl, setLogoUrl] = useState('')
  const [registrationOpen, setRegistrationOpen] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (settings) {
      setInstanceName(settings.instanceName)
      setLogoUrl(settings.logoUrl ?? '')
      setRegistrationOpen(settings.registrationOpen)
    }
  }, [settings])

  async function handleSave() {
    await update.mutateAsync({
      instanceName,
      logoUrl: logoUrl || null,
      registrationOpen,
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="max-w-lg space-y-6">
      <h1 className="text-2xl font-bold">App Settings</h1>

      <div className="rounded-lg border p-6 space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="instanceName">Instance Name</Label>
          <Input
            id="instanceName"
            value={instanceName}
            onChange={(e) => setInstanceName(e.target.value)}
            placeholder="My Notes"
          />
          <p className="text-xs text-muted-foreground">Shown on the login page</p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="logoUrl">Logo URL</Label>
          <Input
            id="logoUrl"
            value={logoUrl}
            onChange={(e) => setLogoUrl(e.target.value)}
            placeholder="https://example.com/logo.png"
          />
          <p className="text-xs text-muted-foreground">Optional. Shown on login page. Leave blank to use default icon.</p>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <Label>Open Registration</Label>
            <p className="text-xs text-muted-foreground">Allow new users to sign up</p>
          </div>
          <Switch checked={registrationOpen} onCheckedChange={setRegistrationOpen} />
        </div>

        <Button onClick={handleSave} disabled={update.isPending} className="w-full">
          {saved ? 'Saved!' : update.isPending ? 'Saving…' : 'Save Settings'}
        </Button>
      </div>
    </div>
  )
}
