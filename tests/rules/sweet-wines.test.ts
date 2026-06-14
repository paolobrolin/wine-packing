import { describe, it, expect } from 'vitest'
import { sweetWinesRule } from '../../src/rules/criteria/sweet-wines'
import type { Bottle, RuleContext } from '../../src/rules/types'

function makeBottle(overrides: Partial<Bottle> = {}): Bottle {
  return {
    barcode: '0001', iwine: 1, vintage: '2020', wine: 'Test Wine',
    producer: 'Test', country: 'France', region: 'Bordeaux', size: '750ml',
    cost: 500, beginConsume: 2025, endConsume: 2035,
    currentLocation: null, currentBin: null, owcGroup: null, wineType: null,
    ...overrides,
  }
}

const context: RuleContext = {
  currentYear: 2026, binCapacities: new Map(),
  verticals: new Map(), owcGroups: new Map(),
}

describe('sweetWinesRule', () => {
  it('keeps White - Sweet/Dessert home', () => {
    const r = sweetWinesRule.evaluate(makeBottle({ wineType: 'White - Sweet/Dessert' }), context)
    expect(r).not.toBeNull()
    expect(r!.recommendedLocation).toBe('HOME')
  })

  it('keeps Red - Sweet/Dessert home', () => {
    const r = sweetWinesRule.evaluate(makeBottle({ wineType: 'Red - Sweet/Dessert' }), context)
    expect(r!.recommendedLocation).toBe('HOME')
  })

  it('does not match Red', () => {
    expect(sweetWinesRule.evaluate(makeBottle({ wineType: 'Red' }), context)).toBeNull()
  })

  it('does not match White', () => {
    expect(sweetWinesRule.evaluate(makeBottle({ wineType: 'White' }), context)).toBeNull()
  })

  it('does not match White - Sparkling', () => {
    expect(sweetWinesRule.evaluate(makeBottle({ wineType: 'White - Sparkling' }), context)).toBeNull()
  })

  it('does not match White - Off-dry', () => {
    expect(sweetWinesRule.evaluate(makeBottle({ wineType: 'White - Off-dry' }), context)).toBeNull()
  })

  it('does not match null wineType', () => {
    expect(sweetWinesRule.evaluate(makeBottle({ wineType: null }), context)).toBeNull()
  })

  it('keeps White - Fortified home (PX, sherry)', () => {
    const r = sweetWinesRule.evaluate(makeBottle({ wineType: 'White - Fortified' }), context)
    expect(r).not.toBeNull()
    expect(r!.recommendedLocation).toBe('HOME')
  })

  it('keeps Red - Fortified home (port)', () => {
    const r = sweetWinesRule.evaluate(makeBottle({ wineType: 'Red - Fortified' }), context)
    expect(r).not.toBeNull()
    expect(r!.recommendedLocation).toBe('HOME')
  })

  it('has priority 35', () => {
    expect(sweetWinesRule.priority).toBe(35)
  })
})
