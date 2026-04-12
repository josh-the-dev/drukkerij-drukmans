import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { useState } from 'react'

// ─── Server function ──────────────────────────────────────────────────────────

const verifyPasscode = createServerFn()
  .inputValidator((passcode: string) => passcode)
  .handler(async ({ data: passcode }) => {
    const adminPasscode = process.env.ADMIN_PASSCODE
    if (!adminPasscode) return false
    return passcode === adminPasscode
  })

// ─── Route ────────────────────────────────────────────────────────────────────

export const Route = createFileRoute('/admin-login')({
  beforeLoad: () => {
    if (typeof window !== 'undefined' && localStorage.getItem('drukmans_admin')) {
      throw redirect({ to: '/admin' })
    }
  },
  component: AdminLoginScreen,
})

// ─── Screen ──────────────────────────────────────────────────────────────────

function AdminLoginScreen() {
  const [passcode, setPasscode] = useState('')
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(false)
    const valid = await verifyPasscode({ data: passcode })
    if (valid) {
      localStorage.setItem('drukmans_admin', JSON.stringify(passcode))
      navigate({ to: '/admin' })
    } else {
      setError(true)
      setLoading(false)
    }
  }

  return (
    <main className="flex min-h-[80vh] flex-col items-center justify-center px-4">
      <form onSubmit={handleSubmit} className="flex w-full max-w-xs flex-col gap-3">
        <h1 className="text-2xl font-bold tracking-tight">Admin</h1>
        <input
          type="password"
          placeholder="Wachtwoord"
          value={passcode}
          onChange={(e) => setPasscode(e.target.value)}
          className="rounded-md border bg-background px-3 py-2 text-sm"
          autoFocus
        />
        {error && (
          <p className="text-sm text-destructive">Ongeldig wachtwoord.</p>
        )}
        <button
          type="submit"
          disabled={loading || !passcode}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {loading ? 'Bezig…' : 'Inloggen'}
        </button>
      </form>
    </main>
  )
}
