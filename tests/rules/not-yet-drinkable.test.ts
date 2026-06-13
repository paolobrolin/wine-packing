import { describe, it, expect } from 'vitest'
import { notYetDrinkableRule } from '../../src/rules/criteria/not-yet-drinkable'
import type { Bottle, RuleContext } from '../../src/rules/types'

function mb(overrides: Partial<Bottle> = {}): Bottle {
  return {
    barcode: '0001', iwine: 1, vintage: '2020', wine: 'Test',
    producer: 'Test', country: 'Italy', region: 'Piedmont', size: '750ml',
    cost: 500, beginConsume: 2030, endConsume: 2045,
    currentLocation: 'Cellar', currentBin: null, owcGroup: null, wineType: null,
    ...overrides,
  }
}
const ctx: RuleContext = { currentYear: 2026, binCapacities: new Map(), verticals: new Map(), owcGroups: new Map() }

describe('notYetDrinkableRule', () => {
  it('recommends REMOTE when begin > currentYear + 3', () => {
    const r = notYetDrinkableRule.evaluate(mb({ beginConsume: 2030 }), ctx)
    expect(r).not.toBeNull()
    expect(r!.recommendedLocation).toBe('REMOTE')
    expect(r!.reason).toContain('2030')
  })

  it('returns null when begin <= currentYear + 3', () => {
    expect(notYetDrinkableRule.evaluate(mb({ beginConsume: 2029 }), ctx)).toBeNull()
    expect(notYetDrinkableRule.evaluate(mb({ beginConsume: 2026 }), ctx)).toBeNull()
  })

  it('returns null when begin is null', () => {
    expect(notYetDrinkableRule.evaluate(mb({ beginConsume: null }), ctx)).toBeNull()
  })

  it('exactly at boundary (2029) stays home', () => {
    expect(notYetDrinkableRule.evaluate(mb({ beginConsume: 2029 }), ctx)).toBeNull()
  })

  it('has priority 15 (between midpoint 10 and vertical 20)', () => {
    expect(notYetDrinkableRule.priority).toBe(15)
  })
})
