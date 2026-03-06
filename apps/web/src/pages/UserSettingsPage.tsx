import { useState } from 'react'
import { authClient } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useUIStore } from '@/store/ui.store'
import { cn } from '@/lib/utils'
import { Moon, Sun, Monitor, Grid2X2 } from 'lucide-react'

// ── Section card wrapper ────────────────────────────────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border bg-card p-6 space-y-4">
      <h2 className="text-base font-semibold">{title}</h2>
      {children}
    </div>
  )
}

// ── Column count picker ─────────────────────────────────────────────────────
const COLUMN_OPTIONS = [
  { value: 0, label: 'Auto', description: 'Fits as many cards as possible' },
  { value: 2, label: '2' },
  { value: 3, label: '3' },
  { value: 4, label: '4' },
  { value: 5, label: '5' },
  { value: 6, label: '6' },
]

export function UserSettingsPage() {
  const { data: session } = authClient.useSession()
  const user = session?.user

  // Profile
  const [name, setName]   = useState(user?.name ?? '')
  const [image, setImage] = useState(user?.image ?? '')
  const [profileMsg, setProfileMsg]   = useState('')
  const [profileErr, setProfileErr]   = useState('')
  const [profileSaving, setProfileSaving] = useState(false)

  // Password
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw]         = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [pwMsg, setPwMsg]   = useState('')
  const [pwErr, setPwErr]   = useState('')
  const [pwSaving, setPwSaving] = useState(false)

  // Display preferences
  const { theme, setTheme, gridColumns, setGridColumns } = useUIStore()

  // ── Profile save ─────────────────────────────────────────────────────────
  async function handleProfileSave(e: React.FormEvent) {
    e.preventDefault()
    setProfileMsg('')
    setProfileErr('')
    setProfileSaving(true)
    try {
      const result = await authClient.updateUser({ name, image: image || undefined })
      if (result.error) {
        setProfileErr(result.error.message ?? 'Failed to update profile')
      } else {
        setProfileMsg('Profile updated successfully')
        setTimeout(() => setProfileMsg(''), 3000)
      }
    } catch {
      setProfileErr('Failed to update profile. Please try again.')
    } finally {
      setProfileSaving(false)
    }
  }

  // ── Password change ───────────────────────────────────────────────────────
  async function handlePasswordSave(e: React.FormEvent) {
    e.preventDefault()
    setPwMsg('')
    setPwErr('')
    if (newPw !== confirmPw) { setPwErr('New passwords do not match'); return }
    if (newPw.length < 8)    { setPwErr('New password must be at least 8 characters'); return }
    setPwSaving(true)
    try {
      const result = await authClient.changePassword({
        currentPassword: currentPw,
        newPassword: newPw,
        revokeOtherSessions: false,
      })
      if (result.error) {
        setPwErr(result.error.message ?? 'Failed to change password')
      } else {
        setPwMsg('Password changed successfully')
        setCurrentPw('')
        setNewPw('')
        setConfirmPw('')
        setTimeout(() => setPwMsg(''), 3000)
      }
    } catch {
      setPwErr('Failed to change password. Please try again.')
    } finally {
      setPwSaving(false)
    }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your profile and display preferences</p>
      </div>

      {/* ── Profile ── */}
      <Section title="Profile">
        <form onSubmit={handleProfileSave} className="space-y-4">
          {/* Avatar preview */}
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-full bg-muted overflow-hidden border flex items-center justify-center shrink-0">
              {image ? (
                <img src={image} alt={name} className="h-full w-full object-cover" />
              ) : (
                <span className="text-xl font-semibold text-muted-foreground">
                  {(name || user?.email || '?').slice(0, 1).toUpperCase()}
                </span>
              )}
            </div>
            <div className="flex-1 space-y-1">
              <p className="text-sm font-medium">{user?.email}</p>
              <p className="text-xs text-muted-foreground">Your account email cannot be changed here</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Display name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="image">Profile picture URL</Label>
            <Input
              id="image"
              type="url"
              value={image}
              onChange={(e) => setImage(e.target.value)}
              placeholder="https://example.com/avatar.png"
            />
            <p className="text-xs text-muted-foreground">Enter a URL to an image (HTTPS recommended)</p>
          </div>

          {profileErr && <p className="text-sm text-destructive">{profileErr}</p>}
          {profileMsg && <p className="text-sm text-green-600 dark:text-green-400">{profileMsg}</p>}

          <Button type="submit" disabled={profileSaving}>
            {profileSaving ? 'Saving…' : 'Save profile'}
          </Button>
        </form>
      </Section>

      {/* ── Password ── */}
      <Section title="Change Password">
        <form onSubmit={handlePasswordSave} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="current-pw">Current password</Label>
            <Input
              id="current-pw"
              type="password"
              value={currentPw}
              onChange={(e) => setCurrentPw(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-pw">New password</Label>
            <Input
              id="new-pw"
              type="password"
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
              placeholder="Min. 8 characters"
              autoComplete="new-password"
              minLength={8}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-pw">Confirm new password</Label>
            <Input
              id="confirm-pw"
              type="password"
              value={confirmPw}
              onChange={(e) => setConfirmPw(e.target.value)}
              placeholder="••••••••"
              autoComplete="new-password"
              required
            />
          </div>

          {pwErr && <p className="text-sm text-destructive">{pwErr}</p>}
          {pwMsg && <p className="text-sm text-green-600 dark:text-green-400">{pwMsg}</p>}

          <Button type="submit" disabled={pwSaving}>
            {pwSaving ? 'Changing…' : 'Change password'}
          </Button>
        </form>
      </Section>

      {/* ── Appearance ── */}
      <Section title="Appearance">
        {/* Theme */}
        <div className="space-y-2">
          <Label>Theme</Label>
          <div className="flex gap-2">
            {[
              { value: 'light' as const, icon: <Sun className="h-4 w-4" />, label: 'Light' },
              { value: 'dark'  as const, icon: <Moon className="h-4 w-4" />, label: 'Dark' },
              { value: 'system' as const, icon: <Monitor className="h-4 w-4" />, label: 'System' },
            ].map(({ value, icon, label }) => (
              <button
                key={value}
                onClick={() => setTheme(value)}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors',
                  theme === value
                    ? 'border-primary bg-primary/10 text-primary font-medium'
                    : 'border-border text-muted-foreground hover:border-primary/50 hover:text-foreground',
                )}
              >
                {icon}
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Grid columns */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Grid2X2 className="h-4 w-4" />
            Note columns
          </Label>
          <p className="text-xs text-muted-foreground">
            How many note columns to show in grid view.
          </p>
          <div className="flex flex-wrap gap-2">
            {COLUMN_OPTIONS.map(({ value, label, description }) => (
              <button
                key={value}
                onClick={() => setGridColumns(value)}
                title={description}
                className={cn(
                  'px-3 py-1.5 rounded-lg border text-sm transition-colors min-w-[48px]',
                  gridColumns === value
                    ? 'border-primary bg-primary/10 text-primary font-medium'
                    : 'border-border text-muted-foreground hover:border-primary/50 hover:text-foreground',
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </Section>
    </div>
  )
}
