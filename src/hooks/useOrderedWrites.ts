import { useCallback, useEffect, useRef } from 'react'

/**
 * Writes for one bottle run in order, so an Undo can never land before the
 * write it undoes. A failure is reported with the label of that write only.
 * It deliberately carries no Undo: a failed write changed nothing in the
 * database, and an Undo snapshot taken earlier could revert a newer move of
 * the same bottle. Reloading shows the true state.
 */
export function useOrderedWrites(onError: (label: string) => void) {
  const chains = useRef(new Map<string, Promise<unknown>>())
  const onErrorRef = useRef(onError)
  useEffect(() => { onErrorRef.current = onError })

  return useCallback((barcode: string, write: () => Promise<unknown>, label?: string) => {
    const prev = chains.current.get(barcode) ?? Promise.resolve()
    const next = prev.catch(() => {}).then(write)
    chains.current.set(barcode, next)
    next.catch(() => onErrorRef.current(label ?? barcode))
  }, [])
}
