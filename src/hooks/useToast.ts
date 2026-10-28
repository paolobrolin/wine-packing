import { useState, useRef, useEffect, useCallback } from 'react'

export interface ToastState {
  message: string
  type: 'success' | 'info' | 'error'
  undoAction: (() => void) | null
}

export function useToast(timeoutMs = 8000) {
  const [toast, setToast] = useState<ToastState | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const show = useCallback((message: string, type: ToastState['type'], undoAction?: () => void) => {
    clearTimeout(timerRef.current)
    // A save error reported for one bottle must not take away the Undo of the
    // move it belongs to (a batch can partly succeed), so it inherits it.
    setToast((prev) => ({
      message, type,
      undoAction: undoAction ?? (type === 'error' ? prev?.undoAction ?? null : null),
    }))
    timerRef.current = setTimeout(() => setToast(null), timeoutMs)
  }, [timeoutMs])

  const dismiss = useCallback(() => {
    clearTimeout(timerRef.current)
    setToast(null)
  }, [])

  useEffect(() => () => clearTimeout(timerRef.current), [])

  return { toast, show, dismiss }
}
