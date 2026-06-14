import { describe, it, expect } from 'vitest'
import { kitchenRule } from '../../src/rules/criteria/kitchen'
import type { Bottle, RuleContext } from '../../src/rules/types'

function makeBottle(overrides: Partial<Bottle> = {}): Bottle {
  return {
    barcode: '0001', iwine: 1, vintage: '2024', wine: 'Test Wine',
    producer: 'Test', country: 'Italy', region: 'Piedmont', size: '750ml',
    cost: 139, beginConsume: 2024, endConsume: 2024,
    currentLocation: null, currentBin: null, owcGroup: null, wineType: null,
    ...overrides,
  }
}

const context: RuleContext = {
  currentYear: 2026, binCapacities: new Map(),
  verticals: new Map(), owcGroups: new Map(),
}

describe('kitchenRule', () => {
  it('catches cheap past-peak wine (end <= 2027, cost < 350)', () => {
    const r = kitchenRule.evaluate(makeBottle({ endConsume: 2026, cost: 139 }), context)
    expect(r).not.toBeNull()
    expect(r!.recommendedLocation).toBe('HOME')
    expect(r!.recommendedBin).toBeNull()
  })

  it('catches end=2027 wine under 350', () => {
    const r = kitchenRule.evaluate(makeBottle({ endConsume: 2027, cost: 269 }), context)
    expect(r).not.toBeNull()
  })

  it('does NOT catch expensive peak wine (cost >= 350)', () => {
    const r = kitchenRule.evaluate(makeBottle({ endConsume: 2026, cost: 600 }), context)
    expect(r).toBeNull()
  })

  it('does NOT catch wine with end > currentYear+1', () => {
    const r = kitchenRule.evaluate(makeBottle({ endConsume: 2028, cost: 139 }), context)
    expect(r).toBeNull()
  })

  it('does NOT catch wine with null endConsume', () => {
    const r = kitchenRule.evaluate(makeBottle({ endConsume: null, cost: 100 }), context)
    expect(r).toBeNull()
  })

  it('catches 0 kr wine (null cost treated as 0)', () => {
    const r = kitchenRule.evaluate(makeBottle({ endConsume: 2025, cost: null }), context)
    expect(r).not.toBeNull()
  })

  it('has priority 36 (beats sweetWines at 35)', () => {
    expect(kitchenRule.priority).toBe(36)
  })
})
