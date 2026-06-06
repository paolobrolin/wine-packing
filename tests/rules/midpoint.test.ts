import { describe, it, expect } from 'vitest'
import { midpointRule } from '../../src/rules/criteria/midpoint'
import type { Bottle, RuleContext } from '../../src/rules/types'

function makeBottle(overrides: Partial<Bottle> = {}): Bottle {
  return {
    barcode: '0001',
    iwine: 1,
    vintage: '2020',
    wine: 'Test Wine',
    producer: 'Test Producer',
    country: 'France',
    region: 'Bordeaux',
    size: '750ml',
    cost: 500,
    beginConsume: 2025,
    endConsume: 2035,
    currentLocation: 'Cellar',
    currentBin: 'Källaren',
    owcGroup: null,
    ...overrides,
  }
}

function makeContext(overrides: Partial<RuleContext> = {}): RuleContext {
  return {
    currentYear: 2026,
    binCapacities: new Map(),
    verticals: new Map(),
    owcGroups: new Map(),
    ...overrides,
  }
}

describe('midpointRule', () => {
  it('recommends REMOTE when midpoint >= currentYear + 3', () => {
    const bottle = makeBottle({ beginConsume: 2025, endConsume: 2045 })
    const result = midpointRule.evaluate(bottle, makeContext())
    expect(result).not.toBeNull()
    expect(result!.recommendedLocation).toBe('REMOTE')
    expect(result!.reason).toContain('midpoint')
  })

  it('returns null when midpoint < currentYear + 3', () => {
    const bottle = makeBottle({ beginConsume: 2024, endConsume: 2028 })
    const result = midpointRule.evaluate(bottle, makeContext())
    expect(result).toBeNull()
  })

  it('recommends REMOTE when midpoint is exactly currentYear + 3', () => {
    // midpoint = (2026 + 2032) / 2 = 2029 = 2026 + 3 — ON the threshold
    const bottle = makeBottle({ beginConsume: 2026, endConsume: 2032 })
    const result = midpointRule.evaluate(bottle, makeContext())
    expect(result).not.toBeNull()
    expect(result!.recommendedLocation).toBe('REMOTE')
  })

  it('assumes begin = currentYear when begin is null', () => {
    // begin=null, end=2040 → midpoint = (2026+2040)/2 = 2033 → REMOTE
    const bottle = makeBottle({ beginConsume: null, endConsume: 2040 })
    const result = midpointRule.evaluate(bottle, makeContext())
    expect(result).not.toBeNull()
    expect(result!.recommendedLocation).toBe('REMOTE')
  })

  it('assumes end = begin + 10 when end is null', () => {
    // begin=2028, end=null → midpoint = 2028+5 = 2033 → REMOTE
    const bottle = makeBottle({ beginConsume: 2028, endConsume: null })
    const result = midpointRule.evaluate(bottle, makeContext())
    expect(result).not.toBeNull()
  })

  it('returns null when both begin and end are null', () => {
    const bottle = makeBottle({ beginConsume: null, endConsume: null })
    const result = midpointRule.evaluate(bottle, makeContext())
    expect(result).toBeNull()
  })

  it('has id "midpoint" and priority 10', () => {
    expect(midpointRule.id).toBe('midpoint')
    expect(midpointRule.priority).toBe(10)
  })
})
