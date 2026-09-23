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
  it('catches cheap past-peak wine (end <= 2028, cost < 350)', () => {
    const r = kitchenRule.evaluate(makeBottle({ endConsume: 2026, cost: 139 }), context)
    expect(r).not.toBeNull()
    expect(r!.recommendedLocation).toBe('HOME')
    expect(r!.recommendedBin).toBe('Köket')
  })

  it('catches end=2028 wine under 350 (Spinetta rosé case)', () => {
    const r = kitchenRule.evaluate(makeBottle({ endConsume: 2028, cost: 169 }), context)
    expect(r).not.toBeNull()
    expect(r!.recommendedBin).toBe('Köket')
  })

  it('does NOT catch expensive peak wine (cost >= 350)', () => {
    const r = kitchenRule.evaluate(makeBottle({ endConsume: 2026, cost: 600 }), context)
    expect(r).toBeNull()
  })

  it('does NOT catch wine with end > currentYear+2', () => {
    const r = kitchenRule.evaluate(makeBottle({ endConsume: 2029, cost: 139 }), context)
    expect(r).toBeNull()
  })

  it('does NOT catch wine with null endConsume', () => {
    const r = kitchenRule.evaluate(makeBottle({ endConsume: null, cost: 100 }), context)
    expect(r).toBeNull()
  })

  it('has priority 36 (beats sweetWines at 35)', () => {
    expect(kitchenRule.priority).toBe(36)
  })
})

describe('kitchenRule — okänt värde är inte samma sak som billigt', () => {
  it('avstår när värdet är okänt (cost null)', () => {
    // Synken sätter cost=null för en 0-kr-flaska utan estimated_value:
    // "värdet är okänt". Ett gåvovin är inte ett kökvin.
    const r = kitchenRule.evaluate(makeBottle({ endConsume: 2026, cost: null }), context)
    expect(r).toBeNull()
  })

  it('avstår när CT-priset är 0 och inget värde kunnat sättas', () => {
    const r = kitchenRule.evaluate(makeBottle({ endConsume: 2026, cost: 0 }), context)
    expect(r).toBeNull()
  })

  it('tar fortfarande vinet när ett lågt värde är känt', () => {
    const r = kitchenRule.evaluate(makeBottle({ endConsume: 2026, cost: 120 }), context)
    expect(r?.recommendedBin).toBe('Köket')
  })
})
