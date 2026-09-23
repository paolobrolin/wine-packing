import { describe, it, expect, vi, beforeEach } from 'vitest'

const auth = {
  signInWithOtp: vi.fn(),
  getSession: vi.fn(),
  signOut: vi.fn(),
  onAuthStateChange: vi.fn(),
}

vi.mock('../../src/data/supabase', () => ({ getSupabase: () => ({ auth }) }))

const { redirectUrl, sendMagicLink, currentSession, signOut, onAuthChange } =
  await import('../../src/data/auth')

beforeEach(() => {
  vi.clearAllMocks()
  auth.signInWithOtp.mockResolvedValue({ error: null })
  auth.getSession.mockResolvedValue({ data: { session: null } })
  auth.signOut.mockResolvedValue({ error: null })
  auth.onAuthStateChange.mockReturnValue({
    data: { subscription: { unsubscribe: vi.fn() } },
  })
})

describe('redirectUrl', () => {
  it('returns the app root, origin and path', () => {
    expect(redirectUrl({ origin: 'https://paolobrolin.github.io', pathname: '/wine-packing/' }))
      .toBe('https://paolobrolin.github.io/wine-packing/')
  })

  it('drops the route hash, because Supabase returns its tokens in the hash', () => {
    // The app routes on '#tasks' / '#cellar' / '#source/X'. A magic link that
    // came back to '#cellar' would have to carry the access token in the same
    // place, and one of the two would win.
    window.location.hash = '#cellar'
    expect(redirectUrl()).not.toContain('#')
  })

  it('drops a query string too', () => {
    expect(redirectUrl({ origin: 'https://x.test', pathname: '/app/' })).toBe('https://x.test/app/')
  })
})

describe('sendMagicLink', () => {
  it('asks Supabase for a link back to the app root', async () => {
    await sendMagicLink('paolo@example.com')
    expect(auth.signInWithOtp).toHaveBeenCalledWith({
      email: 'paolo@example.com',
      options: { emailRedirectTo: redirectUrl(), shouldCreateUser: false },
    })
  })

  it('never creates an account', async () => {
    // Defence in depth. Project-level signup is off, but if it were ever
    // switched back on, an open signup would let anyone request their own link,
    // arrive as `authenticated`, and inherit the full-access policies.
    await sendMagicLink('someone-else@example.com')
    expect(auth.signInWithOtp.mock.calls[0][0].options.shouldCreateUser).toBe(false)
  })

  it('trims and lowercases the address', async () => {
    await sendMagicLink('  Paolo@Example.COM ')
    expect(auth.signInWithOtp.mock.calls[0][0].email).toBe('paolo@example.com')
  })

  it('throws when Supabase refuses', async () => {
    auth.signInWithOtp.mockResolvedValue({ error: { message: 'rate limit exceeded' } })
    await expect(sendMagicLink('paolo@example.com')).rejects.toThrow('rate limit exceeded')
  })
})

describe('currentSession', () => {
  it('returns null when signed out', async () => {
    expect(await currentSession()).toBeNull()
  })

  it('returns the session when signed in', async () => {
    const session = { user: { email: 'paolo@example.com' } }
    auth.getSession.mockResolvedValue({ data: { session } })
    expect(await currentSession()).toBe(session)
  })
})

describe('signOut', () => {
  it('delegates to Supabase', async () => {
    await signOut()
    expect(auth.signOut).toHaveBeenCalled()
  })
})

describe('onAuthChange', () => {
  it('forwards the session to the callback', () => {
    const cb = vi.fn()
    onAuthChange(cb)
    const handler = auth.onAuthStateChange.mock.calls[0][0]
    const session = { user: { email: 'paolo@example.com' } }
    handler('SIGNED_IN', session)
    expect(cb).toHaveBeenCalledWith(session)
  })

  it('returns an unsubscribe that Supabase honours', () => {
    const unsubscribe = vi.fn()
    auth.onAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe } } })
    onAuthChange(vi.fn())()
    expect(unsubscribe).toHaveBeenCalled()
  })
})
