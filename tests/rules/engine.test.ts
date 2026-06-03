import { describe, it, expect } from 'vitest'
import { evaluatePlacement } from '../../src/rules/evaluate'
import type { Bottle, Rule, RuleContext } from '../../src/rules/types'

function makeBottle(overrides: Partial<Bottle> = {}): Bottle {
  return {
    barcode: '0001', iwine: 1, vintage: '2020', wine: 'Test Wine',
    producer: 'Test', country: 'France', region: 'Bordeaux', size: '750ml',
    cost: 500, beginConsume: 2025, endConsume: 2035,
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

const lowPriorityRule: Rule = {
  id: 'low', name: 'Low', priority: 10,
  evaluate: () => ({ recommendedLocation: 'HOME', recommendedBin: null, reason: 'low priority' }),
}

const highPriorityRule: Rule = {
  id: 'high', name: 'High', priority: 50,
  evaluate: () => ({ recommendedLocation: 'REMOTE', recommendedBin: '1.3 SQN', reason: 'high priority' }),
}

const nullRule: Rule = {
  id: 'skip', name: 'Skip', priority: 100,
  evaluate: () => null,
}

describe('evaluatePlacement', () => {
  it('returns the result from the highest-priority rule that matches', () => {
    const result = evaluatePlacement(makeBottle(), [lowPriorityRule, highPriorityRule], makeContext())
    expect(result).not.toBeNull()
    expect(result!.recommendedLocation).toBe('REMOTE')
    expect(result!.reason).toBe('high priority')
  })

  it('falls through null results to the next matching rule', () => {
    const result = evaluatePlacement(makeBottle(), [nullRule, lowPriorityRule], makeContext())
    expect(result).not.toBeNull()
    expect(result!.recommendedLocation).toBe('HOME')
  })

  it('returns null when no rules match', () => {
    const result = evaluatePlacement(makeBottle(), [nullRule], makeContext())
    expect(result).toBeNull()
  })

  it('returns null when rules array is empty', () => {
    const result = evaluatePlacement(makeBottle(), [], makeContext())
    expect(result).toBeNull()
  })

  it('sorts rules by priority descending before evaluating', () => {
    const result = evaluatePlacement(makeBottle(), [lowPriorityRule, highPriorityRule], makeContext())
    expect(result!.reason).toBe('high priority')
  })
})
