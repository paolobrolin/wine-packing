import { useState, useEffect, type ReactNode, type FormEvent } from 'react'
import { currentSession, sendMagicLink, onAuthChange } from '../data/auth'

type State = 'resolving' | 'signed-out' | 'signed-in'

/**
 * Renders the app only for a signed-in session, and a magic-link form otherwise.
 *
 * Wrapped around <App /> in main.tsx rather than folded into App itself, so the
 * 350 lines of routing and view state below it never have to know about auth.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>('resolving')
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    void currentSession().then(session => {
      if (alive) setState(session ? 'signed-in' : 'signed-out')
    })
    // Also covers the magic link landing: Supabase parses the hash, the
    // listener fires, and the gate opens without a reload.
    const unsubscribe = onAuthChange(session => {
      setState(session ? 'signed-in' : 'signed-out')
    })
    return () => {
      alive = false
      unsubscribe()
    }
  }, [])

  async function submit(event: FormEvent) {
    event.preventDefault()
    const address = email.trim()
    if (!address) return
    setError(null)
    try {
      await sendMagicLink(address)
      setSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setSent(false)
    }
  }

  if (state === 'resolving') return null
  if (state === 'signed-in') return <>{children}</>

  return (
    <form className="auth-gate" onSubmit={submit}>
      <h1>Vinflytt</h1>
      <label htmlFor="auth-email">E-post</label>
      <input
        id="auth-email"
        type="email"
        value={email}
        autoComplete="email"
        onChange={event => setEmail(event.target.value)}
      />
      <button type="submit">Skicka inloggningslänk</button>
      {sent && <p>Kolla mejlen — länken loggar in dig på den här enheten.</p>}
      {error && <p role="alert">{error}</p>}
    </form>
  )
}
