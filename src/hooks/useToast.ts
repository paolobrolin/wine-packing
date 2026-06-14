import { useState, useRef, useEffect, useCallback } from 'react'

export interface ToastState {
  message: string
  type: 'success' | 'info' | 'error'
  undoAction: (() => void) | null
}

export function useToast(timeoutMs = 8000) {
  const [toast, setToast] = useState<ToastState | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout>>()

  const show = useCallback((message: string, type: ToastState['type'], undoAction?: () => void) => {
    clearTimeout(timerRef.current)
    setToast({ message, type, undoAction: undoAction ?? null })
    timerRef.current = setTimeout(() => setToast(null), timeoutMs)
  }, [timeoutMs])

  const dismiss = useCallback(() => {
    clearTimeout(timerRef.current)
    setToast(null)
  }, [])

  useEffect(() => () => clearTimeout(timerRef.current), [])

  return { toast, show, dismiss }
}
