import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useToast } from '../../src/hooks/useToast'

describe('useToast', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers() })

  it('starts with no toast', () => {
    const { result } = renderHook(() => useToast())
    expect(result.current.toast).toBeNull()
  })

  it('shows a toast with message and type', () => {
    const { result } = renderHook(() => useToast())
    act(() => result.current.show('Test message', 'success'))
    expect(result.current.toast).not.toBeNull()
    expect(result.current.toast!.message).toBe('Test message')
    expect(result.current.toast!.type).toBe('success')
  })

  it('auto-dismisses after timeout', () => {
    const { result } = renderHook(() => useToast(5000))
    act(() => result.current.show('Test', 'success'))
    expect(result.current.toast).not.toBeNull()
    act(() => { vi.advanceTimersByTime(5000) })
    expect(result.current.toast).toBeNull()
  })

  it('includes undo callback when provided', () => {
    const undo = vi.fn()
    const { result } = renderHook(() => useToast())
    act(() => result.current.show('Test', 'success', undo))
    expect(result.current.toast!.undoAction).toBe(undo)
  })

  it('has null undoAction when not provided', () => {
    const { result } = renderHook(() => useToast())
    act(() => result.current.show('Test', 'info'))
    expect(result.current.toast!.undoAction).toBeNull()
  })

  it('replaces previous toast with new one', () => {
    const { result } = renderHook(() => useToast())
    act(() => result.current.show('First', 'success'))
    act(() => result.current.show('Second', 'info'))
    expect(result.current.toast!.message).toBe('Second')
  })

  it('dismiss clears toast immediately', () => {
    const { result } = renderHook(() => useToast())
    act(() => result.current.show('Test', 'success'))
    act(() => result.current.dismiss())
    expect(result.current.toast).toBeNull()
  })

  it('dismiss cancels auto-dismiss timer', () => {
    const { result } = renderHook(() => useToast(5000))
    act(() => result.current.show('Test', 'success'))
    act(() => result.current.dismiss())
    act(() => { vi.advanceTimersByTime(5000) })
    expect(result.current.toast).toBeNull()
  })

  it('new toast resets the timeout', () => {
    const { result } = renderHook(() => useToast(5000))
    act(() => result.current.show('First', 'success'))
    act(() => { vi.advanceTimersByTime(3000) })
    act(() => result.current.show('Second', 'info'))
    act(() => { vi.advanceTimersByTime(3000) })
    expect(result.current.toast).not.toBeNull()
    expect(result.current.toast!.message).toBe('Second')
    act(() => { vi.advanceTimersByTime(2000) })
    expect(result.current.toast).toBeNull()
  })

  it('supports error type', () => {
    const { result } = renderHook(() => useToast())
    act(() => result.current.show('Error!', 'error'))
    expect(result.current.toast!.type).toBe('error')
  })

  it('cleans up timer on unmount', () => {
    const { result, unmount } = renderHook(() => useToast(5000))
    act(() => result.current.show('Test', 'success'))
    unmount()
    expect(() => { vi.advanceTimersByTime(5000) }).not.toThrow()
  })
})
