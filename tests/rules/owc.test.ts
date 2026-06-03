import { describe, it, expect } from 'vitest'
import { owcRule } from '../../src/rules/criteria/owc'
import type { Bottle, RuleContext } from '../../src/rules/types'

function makeBottle(overrides: Partial<Bottle> = {}): Bottle {
  return {
    barcode: '0001', iwine: 1, vintage: '2021', wine: 'Andremily EABA',
    producer: 'Andremily', country: 'USA', region: 'California', size: '1.5L',
    cost: 3000, beginConsume: 2024, endConsume: 2030,
    currentLocation: 'Cellar', currentBin: null, owcGroup: 'Andremily MAG Box 2',
    ...overrides,
  }
}

function makeContext(overrides: Partial<RuleContext> = {}): RuleContext {
  return {
    currentYear: 2026, binCapacities: new Map(),
    verticals: new Map(), owcGroups: new Map(), ...overrides,
  }
}

describe('owcRule', () => {
  it('forces REMOTE when any sibling in the OWC group qualifies', () => {
    const eaba = makeBottle({ barcode: '001', beginConsume: 2024, endConsume: 2030 }) // midpoint 2027 → HOME
    const grenache = makeBottle({ barcode: '002', wine: 'Andremily Grenache', beginConsume: 2030, endConsume: 2045 }) // midpoint 2037.5 → REMOTE
    const owcGroups = new Map([['Andremily MAG Box 2', [eaba, grenache]]])

    const result = owcRule.evaluate(eaba, makeContext({ owcGroups }))
    expect(result).not.toBeNull()
    expect(result!.recommendedLocation).toBe('REMOTE')
    expect(result!.reason).toContain('OWC')
  })

  it('returns null when bottle has no owcGroup', () => {
    const bottle = makeBottle({ owcGroup: null })
    const result = owcRule.evaluate(bottle, makeContext())
    expect(result).toBeNull()
  })

  it('returns null when no sibling qualifies for REMOTE', () => {
    const b1 = makeBottle({ barcode: '001', beginConsume: 2024, endConsume: 2028 })
    const b2 = makeBottle({ barcode: '002', beginConsume: 2024, endConsume: 2028 })
    const owcGroups = new Map([['Andremily MAG Box 2', [b1, b2]]])

    const result = owcRule.evaluate(b1, makeContext({ owcGroups }))
    expect(result).toBeNull()
  })

  it('returns null when bottle already qualifies via midpoint (let midpoint handle it)', () => {
    const bottle = makeBottle({ beginConsume: 2030, endConsume: 2050 }) // midpoint 2040 → already REMOTE
    const owcGroups = new Map([['Andremily MAG Box 2', [bottle]]])

    const result = owcRule.evaluate(bottle, makeContext({ owcGroups }))
    expect(result).toBeNull()
  })

  it('has priority 30', () => {
    expect(owcRule.priority).toBe(30)
  })
})
