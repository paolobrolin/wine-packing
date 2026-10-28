import { useCallback, useEffect, useRef } from 'react'

export interface WriteContext {
  /** Names the bottle(s) in the error message. */
  label: string
  /** The Undo of the action this write belongs to, if it has one. */
  undo?: () => void
}

/**
 * Writes for one bottle run in order, so an Undo can never land before the
 * write it undoes. A failure is reported with the context of that write — never
 * with whatever toast happens to be on screen, which may belong to another move.
 */
export function useOrderedWrites(onError: (ctx: WriteContext) => void) {
  const chains = useRef(new Map<string, Promise<unknown>>())
  const onErrorRef = useRef(onError)
  useEffect(() => { onErrorRef.current = onError })

  return useCallback((barcode: string, write: () => Promise<unknown>, ctx?: WriteContext) => {
    const prev = chains.current.get(barcode) ?? Promise.resolve()
    const next = prev.catch(() => {}).then(write)
    chains.current.set(barcode, next)
    next.catch(() => onErrorRef.current(ctx ?? { label: barcode }))
  }, [])
}
