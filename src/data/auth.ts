import type { Session } from '@supabase/supabase-js'
import { getSupabase } from './supabase'

interface Loc {
  origin: string
  pathname: string
}

/**
 * Where a magic link should land: origin and path, nothing else.
 *
 * The app routes on the hash — '#tasks', '#cellar', '#source/X' — and Supabase
 * returns its access and refresh tokens in the hash as well. A redirect that
 * carried a route would put the two in the same place, and one would win.
 */
export function redirectUrl(loc: Loc = window.location): string {
  return `${loc.origin}${loc.pathname}`
}

export async function sendMagicLink(email: string): Promise<void> {
  const { error } = await getSupabase().auth.signInWithOtp({
    email: email.trim().toLowerCase(),
    options: {
      emailRedirectTo: redirectUrl(),
      // The app never creates accounts. Project-level signup is off; this
      // makes it so regardless, because an open signup would let anyone
      // request their own link and inherit the full-access policies.
      shouldCreateUser: false,
    },
  })
  if (error) throw new Error(error.message)
}

export async function currentSession(): Promise<Session | null> {
  const { data } = await getSupabase().auth.getSession()
  return data.session
}

export async function signOut(): Promise<void> {
  await getSupabase().auth.signOut()
}

/** Subscribes to sign-in and sign-out. Returns the unsubscribe. */
export function onAuthChange(cb: (session: Session | null) => void): () => void {
  const { data } = getSupabase().auth.onAuthStateChange((_event, session) => cb(session))
  return () => data.subscription.unsubscribe()
}
