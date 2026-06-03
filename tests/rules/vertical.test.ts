import { describe, it, expect } from 'vitest'
import { verticalRule } from '../../src/rules/criteria/vertical'
import type { Bottle, RuleContext } from '../../src/rules/types'

function makeBottle(overrides: Partial<Bottle> = {}): Bottle {
  return {
    barcode: '0001', iwine: 1, vintage: '2020', wine: 'Colgin IX Estate',
    producer: 'Colgin', country: 'USA', region: 'California', size: '750ml',
    cost: 7000, beginConsume: 2025, endConsume: 2045,
    currentLocation: 'Cellar', currentBin: 'Källaren', owcGroup: null,
    ...overrides,
  }
}

function makeContext(overrides: Partial<RuleContext> = {}): RuleContext {
  return {
    currentYear: 2026, binCapacities: new Map(),
    verticals: new Map(), owcGroups: new Map(), ...overrides,
  }
}

describe('verticalRule', () => {
  it('forces REMOTE when an older vintage in the vertical is already REMOTE', () => {
    const bottles: Bottle[] = [
      makeBottle({ barcode: '001', vintage: '2017', beginConsume: 2025, endConsume: 2060 }),
      makeBottle({ barcode: '002', vintage: '2018', beginConsume: 2024, endConsume: 2028 }),
    ]
    // 2017 midpoint = 2042.5 → REMOTE, 2018 midpoint = 2026 → HOME
    // But vertical rule: 2018 should follow 2017 → REMOTE
    const verticals = new Map([['Colgin IX Estate', bottles]])
    const ctx = makeContext({ verticals })

    const result = verticalRule.evaluate(bottles[1], ctx)
    expect(result).not.toBeNull()
    expect(result!.recommendedLocation).toBe('REMOTE')
    expect(result!.reason).toContain('vertical')
  })

  it('returns null when bottle is the oldest in the vertical', () => {
    const bottles: Bottle[] = [
      makeBottle({ barcode: '001', vintage: '2017', beginConsume: 2025, endConsume: 2060 }),
      makeBottle({ barcode: '002', vintage: '2018', beginConsume: 2024, endConsume: 2028 }),
    ]
    const verticals = new Map([['Colgin IX Estate', bottles]])
    const ctx = makeContext({ verticals })

    // 2017 is the first EXT — it got there via midpoint rule, not vertical
    const result = verticalRule.evaluate(bottles[0], ctx)
    expect(result).toBeNull()
  })

  it('returns null when no bottles in the vertical go external', () => {
    const bottles: Bottle[] = [
      makeBottle({ barcode: '001', vintage: '2017', beginConsume: 2024, endConsume: 2028 }),
      makeBottle({ barcode: '002', vintage: '2018', beginConsume: 2024, endConsume: 2028 }),
    ]
    const verticals = new Map([['Colgin IX Estate', bottles]])
    const ctx = makeContext({ verticals })

    const result = verticalRule.evaluate(bottles[1], ctx)
    expect(result).toBeNull()
  })

  it('returns null when bottle is not in any vertical', () => {
    const bottle = makeBottle()
    const ctx = makeContext({ verticals: new Map() })
    const result = verticalRule.evaluate(bottle, ctx)
    expect(result).toBeNull()
  })

  it('normalizes NoK names for vertical grouping', () => {
    const bottles: Bottle[] = [
      makeBottle({ barcode: '001', vintage: '2020', wine: 'Next of Kyn No~14 Cumulus Vineyard', beginConsume: 2025, endConsume: 2045 }),
      makeBottle({ barcode: '002', vintage: '2021', wine: 'Next of Kyn No~15 Cumulus Vineyard', beginConsume: 2024, endConsume: 2030 }),
    ]
    // Vertical key should normalize both to "Next of Kyn Cumulus Vineyard"
    const verticals = new Map([['Next of Kyn Cumulus Vineyard', bottles]])
    const ctx = makeContext({ verticals })

    const result = verticalRule.evaluate(bottles[1], ctx)
    expect(result).not.toBeNull()
    expect(result!.recommendedLocation).toBe('REMOTE')
  })

  it('normalizes Roman numerals for vertical grouping', () => {
    const bottles: Bottle[] = [
      makeBottle({ barcode: '001', vintage: '2019', wine: 'SQN Grenache Distenta I', beginConsume: 2025, endConsume: 2040 }),
      makeBottle({ barcode: '002', vintage: '2021', wine: 'SQN Grenache Distenta III', beginConsume: 2024, endConsume: 2030 }),
    ]
    const verticals = new Map([['SQN Grenache Distenta', bottles]])
    const ctx = makeContext({ verticals })

    const result = verticalRule.evaluate(bottles[1], ctx)
    expect(result).not.toBeNull()
  })

  it('has priority 20', () => {
    expect(verticalRule.priority).toBe(20)
  })
})
