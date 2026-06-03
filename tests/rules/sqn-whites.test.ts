import { describe, it, expect } from 'vitest'
import { sqnWhitesRule } from '../../src/rules/criteria/sqn-whites'
import type { Bottle, RuleContext } from '../../src/rules/types'

function makeBottle(overrides: Partial<Bottle> = {}): Bottle {
  return {
    barcode: '0001', iwine: 1, vintage: '2020', wine: 'Test Wine',
    producer: 'Test', country: 'USA', region: 'California', size: '750ml',
    cost: 500, beginConsume: 2025, endConsume: 2045,
    currentLocation: 'REMOTE', currentBin: '1.3 SQN REGULAR', owcGroup: null,
    ...overrides,
  }
}

const ctx: RuleContext = {
  currentYear: 2026, binCapacities: new Map(),
  verticals: new Map(), owcGroups: new Map(),
}

describe('sqnWhitesRule', () => {
  it('recommends HOME for SQN Tectumque', () => {
    const bottle = makeBottle({ producer: 'Sine Qua Non', wine: 'Sine Qua Non Tectumque' })
    const result = sqnWhitesRule.evaluate(bottle, ctx)
    expect(result).not.toBeNull()
    expect(result!.recommendedLocation).toBe('HOME')
  })

  it('recommends HOME for SQN Distenta White', () => {
    const bottle = makeBottle({ producer: 'Sine Qua Non', wine: 'Sine Qua Non Distenta White II' })
    const result = sqnWhitesRule.evaluate(bottle, ctx)
    expect(result).not.toBeNull()
    expect(result!.recommendedLocation).toBe('HOME')
  })

  it('recommends HOME for SQN Entre Chien et Loup', () => {
    const bottle = makeBottle({ producer: 'Sine Qua Non', wine: 'Sine Qua Non Entre Chien et Loup' })
    const result = sqnWhitesRule.evaluate(bottle, ctx)
    expect(result).not.toBeNull()
    expect(result!.recommendedLocation).toBe('HOME')
  })

  it('returns null for SQN red wines', () => {
    const bottle = makeBottle({ producer: 'Sine Qua Non', wine: 'Sine Qua Non Grenache Distenta I' })
    const result = sqnWhitesRule.evaluate(bottle, ctx)
    expect(result).toBeNull()
  })

  it('returns null for non-SQN wines', () => {
    const bottle = makeBottle({ producer: 'Kongsgaard', wine: 'Kongsgaard Chardonnay' })
    const result = sqnWhitesRule.evaluate(bottle, ctx)
    expect(result).toBeNull()
  })

  it('has priority 40 (higher than midpoint)', () => {
    expect(sqnWhitesRule.priority).toBe(40)
  })
})
