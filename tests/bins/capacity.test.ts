import { describe, it, expect } from 'vitest'
import { createCapacityTracker } from '../../src/bins/capacity'

describe('CapacityTracker', () => {
  function makeTracker(bins: Record<string, { current: number; max: number }> = {}) {
    const map = new Map(Object.entries(bins))
    return createCapacityTracker(map)
  }

  it('hasRoom returns true when under capacity', () => {
    const ct = makeTracker({ '2.1 BDX LB': { current: 5, max: 20 } })
    expect(ct.hasRoom('2.1 BDX LB')).toBe(true)
  })

  it('hasRoom returns false when at capacity', () => {
    const ct = makeTracker({ '2.1 BDX LB': { current: 20, max: 20 } })
    expect(ct.hasRoom('2.1 BDX LB')).toBe(false)
  })

  it('hasRoom checks for n bottles', () => {
    const ct = makeTracker({ '2.1 BDX LB': { current: 18, max: 20 } })
    expect(ct.hasRoom('2.1 BDX LB', 2)).toBe(true)
    expect(ct.hasRoom('2.1 BDX LB', 3)).toBe(false)
  })

  it('reserve increments current count', () => {
    const ct = makeTracker({ '2.1 BDX LB': { current: 5, max: 20 } })
    ct.reserve('2.1 BDX LB')
    expect(ct.remaining('2.1 BDX LB')).toBe(14)
  })

  it('reserve returns false when full', () => {
    const ct = makeTracker({ '2.1 BDX LB': { current: 20, max: 20 } })
    expect(ct.reserve('2.1 BDX LB')).toBe(false)
    expect(ct.remaining('2.1 BDX LB')).toBe(0)
  })

  it('unknown bins have unlimited capacity (fail-open)', () => {
    const ct = makeTracker({})
    expect(ct.hasRoom('unknown-bin')).toBe(true)
    expect(ct.reserve('unknown-bin')).toBe(true)
    expect(ct.remaining('unknown-bin')).toBe(Infinity)
  })

  it('snapshot returns deep copy', () => {
    const ct = makeTracker({ '2.1 BDX LB': { current: 5, max: 20 } })
    const snap1 = ct.snapshot()
    ct.reserve('2.1 BDX LB')
    const snap2 = ct.snapshot()
    expect(snap1.get('2.1 BDX LB')!.current).toBe(5)
    expect(snap2.get('2.1 BDX LB')!.current).toBe(6)
  })

  it('does not mutate the source map', () => {
    const source = new Map([['bin-a', { current: 3, max: 10 }]])
    const ct = createCapacityTracker(source)
    ct.reserve('bin-a', 5)
    expect(source.get('bin-a')!.current).toBe(3)
  })
})
