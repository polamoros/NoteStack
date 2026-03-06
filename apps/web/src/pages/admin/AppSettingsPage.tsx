import { useState, useEffect, useRef } from 'react'
import { trpc } from '@/api/client'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Upload, X } from 'lucide-react'

export function AdminAppSettingsPage() {
  const qc = useQueryClient()
  const { data: settings } = trpc.settings.getPublic.useQuery()
  const update = trpc.admin.settings.update.useMutation({
    onSuccess: () => qc.invalidateQueries({ queryKey: [['settings']] }),
  })

  const [instanceName, setInstanceName] = useState('')
  const [logoUrl, setLogoUrl] = useState('')           // URL input fallback
  const [logoPreview, setLogoPreview] = useState<string | null>(null)  // base64 preview
  const [registrationOpen, setRegistrationOpen] = useState(false)
  const [saved, setSaved] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (settings) {
      setInstanceName(settings.instanceName)
      const logo = settings.logoUrl ?? ''
      if (logo.startsWith('data:')) {
        setLogoPreview(logo)
        setLogoUrl('')
      } else {
        setLogoUrl(logo)
        setLogoPreview(null)
      }
      setRegistrationOpen(settings.registrationOpen)
    }
  }, [settings])

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string
      setLogoPreview(dataUrl)
      setLogoUrl('')
    }
    reader.readAsDataURL(file)
  }

  function clearLogo() {
    setLogoPreview(null)
    setLogoUrl('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleSave() {
    const finalLogo = logoPreview ?? (logoUrl || null)
    await update.mutateAsync({
      instanceName,
      logoUrl: finalLogo,
      registrationOpen,
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const currentLogo = logoPreview ?? (logoUrl || null)

  return (
    <div className="max-w-lg mx-auto space-y-6">
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
          <p className="text-xs text-muted-foreground">Shown in the sidebar and on the login page</p>
        </div>

        {/* Logo upload */}
        <div className="space-y-2">
          <Label>Logo</Label>
          {currentLogo ? (
            <div className="flex items-center gap-3">
              <img
                src={currentLogo}
                alt="App logo preview"
                className="h-16 w-16 rounded-lg object-cover border"
              />
              <div className="flex flex-col gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-3.5 w-3.5 mr-1.5" />
                  Replace
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={clearLogo}
                  className="text-destructive hover:text-destructive"
                >
                  <X className="h-3.5 w-3.5 mr-1.5" />
                  Remove
                </Button>
              </div>
            </div>
          ) : (
            <div
              className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-6 cursor-pointer hover:border-primary/60 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-6 w-6 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">Click to upload an image</p>
              <p className="text-xs text-muted-foreground/70 mt-0.5">PNG, JPG, SVG up to 1MB</p>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
          {/* Fallback URL input */}
          {!logoPreview && (
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-muted-foreground shrink-0">or URL:</span>
              <Input
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="https://example.com/logo.png"
                className="h-7 text-xs"
              />
            </div>
          )}
          <p className="text-xs text-muted-foreground">Optional. Leave blank to use the default icon.</p>
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
