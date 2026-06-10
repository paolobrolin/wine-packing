import type { CapacityTracker } from './types'

export function createCapacityTracker(
  initial: Map<string, { current: number; max: number }>,
): CapacityTracker {
  const state = new Map<string, { current: number; max: number }>()
  for (const [k, v] of initial) {
    state.set(k, { current: v.current, max: v.max })
  }

  return {
    hasRoom(binId: string, n = 1): boolean {
      const bin = state.get(binId)
      if (bin == null) return true
      return bin.current + n <= bin.max
    },

    reserve(binId: string, n = 1): boolean {
      const bin = state.get(binId)
      if (bin == null) return true
      if (bin.current + n > bin.max) return false
      bin.current += n
      return true
    },

    remaining(binId: string): number {
      const bin = state.get(binId)
      if (bin == null) return Infinity
      return Math.max(0, bin.max - bin.current)
    },

    snapshot(): Map<string, { current: number; max: number }> {
      const snap = new Map<string, { current: number; max: number }>()
      for (const [k, v] of state) {
        snap.set(k, { ...v })
      }
      return snap
    },
  }
}
