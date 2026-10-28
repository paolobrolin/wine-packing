import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useOrderedWrites } from '../../src/hooks/useOrderedWrites'

const tick = () => new Promise((r) => setTimeout(r, 0))

describe('useOrderedWrites', () => {
  it('runs writes for the same bottle in order, even if the first is slower', async () => {
    const order: string[] = []
    const { result } = renderHook(() => useOrderedWrites(() => {}))
    let release!: () => void
    act(() => {
      result.current('A', () => new Promise<void>((r) => { release = () => { order.push('forward'); r() } }))
      result.current('A', async () => { order.push('undo') })
    })
    await tick()
    expect(order).toEqual([])
    release()
    await tick(); await tick()
    expect(order).toEqual(['forward', 'undo'])
  })

  it('reports a failure with the undo that belongs to that write, not another one', async () => {
    const onError = vi.fn()
    const undoA = vi.fn()
    const { result } = renderHook(() => useOrderedWrites(onError))
    act(() => {
      result.current('A', () => Promise.reject(new Error('net')), { label: 'A', undo: undoA })
      result.current('B', async () => {}, { label: 'B', undo: vi.fn() })
    })
    await tick(); await tick()
    expect(onError).toHaveBeenCalledTimes(1)
    expect(onError).toHaveBeenCalledWith({ label: 'A', undo: undoA })
  })

  it('keeps running later writes after an earlier one failed', async () => {
    const later = vi.fn(async () => {})
    const { result } = renderHook(() => useOrderedWrites(() => {}))
    act(() => {
      result.current('A', () => Promise.reject(new Error('x')))
      result.current('A', later)
    })
    await tick(); await tick()
    expect(later).toHaveBeenCalled()
  })
})
