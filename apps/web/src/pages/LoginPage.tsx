import { useState } from 'react'
import { authClient } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { trpc } from '@/api/client'
import { FileText, Sun, Moon, Monitor } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useUIStore } from '@/store/ui.store'

export function LoginPage() {
  const theme = useUIStore((s) => s.theme)
  const setTheme = useUIStore((s) => s.setTheme)

  // Shared fields
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Sign-up specific fields
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [name, setName] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const { data: settings } = trpc.settings.getPublic.useQuery()
  const { data: oidcProviders } = trpc.admin.authConfig.listEnabled.useQuery()

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      // Use native fetch — authClient.signIn.email() hangs waiting for internal
      // session refresh that never resolves. Cookie is set via Set-Cookie header.
      const res = await fetch('/api/auth/sign-in/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        credentials: 'include',
      })
      if (res.ok) {
        window.location.href = '/'
        return
      }
      const data = await res.json().catch(() => ({}))
      setError((data as Record<string, string>).message ?? 'Invalid email or password')
      setLoading(false)
    } catch {
      setError('Login failed. Please try again.')
      setLoading(false)
    }
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/auth/sign-up/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
        credentials: 'include',
      })
      if (res.ok) {
        window.location.href = '/'
        return
      }
      const data = await res.json().catch(() => ({}))
      setError((data as Record<string, string>).message ?? 'Registration failed')
      setLoading(false)
    } catch {
      setError('Registration failed. Please try again.')
      setLoading(false)
    }
  }

  async function handleOidc(providerId: string) {
    await authClient.signIn.social({
      provider: providerId as Parameters<typeof authClient.signIn.social>[0]['provider'],
      callbackURL: '/',
    })
  }

  const registrationOpen = settings?.registrationOpen === true

  const themeIcon =
    theme === 'dark' ? <Moon className="h-4 w-4" /> :
    theme === 'light' ? <Sun className="h-4 w-4" /> :
    <Monitor className="h-4 w-4" />

  function cycleTheme() {
    setTheme(theme === 'system' ? 'light' : theme === 'light' ? 'dark' : 'system')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      {/* Theme toggle — top right */}
      <button
        onClick={cycleTheme}
        title={`Theme: ${theme}`}
        className="absolute top-4 right-4 p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
      >
        {themeIcon}
      </button>

      <div className="w-full max-w-sm space-y-8">
        {/* Logo */}
        <div className="flex flex-col items-center gap-2">
          {settings?.logoUrl ? (
            <img src={settings.logoUrl} alt="Logo" className="h-12 w-12 object-contain" />
          ) : (
            <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center">
              <FileText className="h-6 w-6 text-primary-foreground" />
            </div>
          )}
          <h1 className="text-2xl font-bold tracking-tight">
            {settings?.instanceName ?? 'NoteStack'}
          </h1>

          {/* Mode tabs — only shown when registration is open */}
          {registrationOpen ? (
            <div className="flex rounded-lg border border-border overflow-hidden mt-1">
              <button
                className={cn(
                  'px-5 py-1.5 text-sm font-medium transition-colors',
                  mode === 'signin'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted',
                )}
                onClick={() => { setMode('signin'); setError('') }}
              >
                Sign in
              </button>
              <button
                className={cn(
                  'px-5 py-1.5 text-sm font-medium transition-colors',
                  mode === 'signup'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted',
                )}
                onClick={() => { setMode('signup'); setError('') }}
              >
                Sign up
              </button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Sign in to your account</p>
          )}
        </div>

        {/* ── Sign-in form ── */}
        {mode === 'signin' && (
          <form onSubmit={handleSignIn} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>
        )}

        {/* ── Sign-up form ── */}
        {mode === 'signup' && (
          <form onSubmit={handleSignUp} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                type="text"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoComplete="name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="signup-email">Email</Label>
              <Input
                id="signup-email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="signup-password">Password</Label>
              <Input
                id="signup-password"
                type="password"
                placeholder="Min. 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
                minLength={8}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm password</Label>
              <Input
                id="confirm-password"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
              />
            </div>
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Creating account…' : 'Create account'}
            </Button>
          </form>
        )}

        {/* OIDC providers */}
        {oidcProviders && oidcProviders.length > 0 && (
          <div className="space-y-3">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
              </div>
            </div>
            {oidcProviders.map((provider) => (
              <Button
                key={provider.id}
                variant="outline"
                className="w-full"
                onClick={() => handleOidc(provider.id)}
              >
                {provider.name}
              </Button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
