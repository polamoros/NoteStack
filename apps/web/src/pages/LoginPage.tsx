import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authClient } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { trpc } from '@/api/client'
import { FileText } from 'lucide-react'

export function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const { data: settings } = trpc.settings.getPublic.useQuery()
  const { data: oidcProviders } = trpc.admin.authConfig.listEnabled.useQuery()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const result = await authClient.signIn.email({ email, password })
      if (result.error) {
        setError(result.error.message ?? 'Invalid credentials')
      } else {
        navigate('/')
      }
    } catch {
      setError('Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleOidc(providerId: string) {
    await authClient.signIn.social({
      provider: providerId as any,
      callbackURL: '/',
    })
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
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
            {settings?.instanceName ?? 'Notes'}
          </h1>
          <p className="text-sm text-muted-foreground">Sign in to your account</p>
        </div>

        {/* Email/password form */}
        <form onSubmit={handleSubmit} className="space-y-4">
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
