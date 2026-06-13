import { describe, it, expect } from 'vitest'
import { sweetWinesRule } from '../../src/rules/criteria/sweet-wines'
import type { Bottle, RuleContext } from '../../src/rules/types'

function makeBottle(overrides: Partial<Bottle> = {}): Bottle {
  return {
    barcode: '0001', iwine: 1, vintage: '2020', wine: 'Test Wine',
    producer: 'Test', country: 'France', region: 'Bordeaux', size: '750ml',
    cost: 500, beginConsume: 2025, endConsume: 2035,
    currentLocation: null, currentBin: null, owcGroup: null,
    ...overrides,
  }
}

const context: RuleContext = {
  currentYear: 2026, binCapacities: new Map(),
  verticals: new Map(), owcGroups: new Map(),
}

describe('sweetWinesRule', () => {
  it('keeps Sauternes home', () => {
    const r = sweetWinesRule.evaluate(makeBottle({ wine: 'Château La Tour Blanche Sauternes' }), context)
    expect(r).not.toBeNull()
    expect(r!.recommendedLocation).toBe('HOME')
  })

  it('keeps Barsac home', () => {
    const r = sweetWinesRule.evaluate(makeBottle({ wine: 'Château Coutet Barsac' }), context)
    expect(r).not.toBeNull()
    expect(r!.recommendedLocation).toBe('HOME')
  })

  it('keeps Auslese home', () => {
    const r = sweetWinesRule.evaluate(makeBottle({ wine: 'Molitor Riesling Auslese' }), context)
    expect(r!.recommendedLocation).toBe('HOME')
  })

  it('keeps Recioto home', () => {
    const r = sweetWinesRule.evaluate(makeBottle({ wine: 'Quintarelli Recioto della Valpolicella' }), context)
    expect(r!.recommendedLocation).toBe('HOME')
  })

  it('keeps Vin Santo home', () => {
    const r = sweetWinesRule.evaluate(makeBottle({ wine: 'Tenuta Trerose Vin Santo di Montepulciano' }), context)
    expect(r!.recommendedLocation).toBe('HOME')
  })

  it('keeps Moscato home', () => {
    const r = sweetWinesRule.evaluate(makeBottle({ wine: 'G.D. Vajra Moscato d Asti' }), context)
    expect(r!.recommendedLocation).toBe('HOME')
  })

  it('does not match dry wines', () => {
    const r = sweetWinesRule.evaluate(makeBottle({ wine: 'Oddero Barolo Brunate' }), context)
    expect(r).toBeNull()
  })

  it('has priority 35', () => {
    expect(sweetWinesRule.priority).toBe(35)
  })
})
