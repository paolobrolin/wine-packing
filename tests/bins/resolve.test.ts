import { describe, it, expect } from 'vitest'
import { resolveBin, resolveAllBins } from '../../src/bins/resolve'
import { createCapacityTracker } from '../../src/bins/capacity'
import type { BinRule, BinResolverContext } from '../../src/bins/types'
import type { Bottle } from '../../src/rules/types'

function makeBottle(overrides: Partial<Bottle> = {}): Bottle {
  return {
    barcode: '0001', iwine: 1, vintage: '2020', wine: 'Test Wine',
    producer: 'Test', country: 'France', region: 'Bordeaux', size: '750ml',
    cost: 500, beginConsume: 2025, endConsume: 2035,
    currentLocation: null, currentBin: null, owcGroup: null,
    ...overrides,
  }
}

function makeContext(overrides: Partial<BinResolverContext> = {}): BinResolverContext {
  return {
    currentYear: 2026,
    capacity: createCapacityTracker(new Map()),
    allBottles: [],
    owcGroups: new Map(),
    owcAssignments: new Map(),
    ...overrides,
  }
}

const frenchRule: BinRule = {
  id: 'test/french', name: 'French', priority: 10, location: 'REMOTE',
  binId: '2.6 FR OTHER', overflowBinId: null,
  match: (b) => b.country === 'France',
}

const bdxRule: BinRule = {
  id: 'test/bdx', name: 'Bordeaux', priority: 50, location: 'REMOTE',
  binId: '2.1 BDX LB', overflowBinId: '2.6 FR OTHER',
  match: (b) => b.country === 'France' && b.region === 'Bordeaux',
}

const italyRule: BinRule = {
  id: 'test/italy', name: 'Italy', priority: 10, location: 'REMOTE',
  binId: '3.8 OVERFLOW', overflowBinId: null,
  match: (b) => b.country === 'Italy',
}

const homeItalyRule: BinRule = {
  id: 'test/home-italy', name: 'Home Italy', priority: 30, location: 'HOME',
  binId: '1. ITALIA', overflowBinId: null,
  match: (b) => b.country === 'Italy',
}

describe('resolveBin', () => {
  it('returns matching bin for a bottle', () => {
    const bottle = makeBottle({ country: 'France', region: 'Bordeaux' })
    const result = resolveBin(bottle, 'REMOTE', [bdxRule, frenchRule], makeContext())
    expect(result).not.toBeNull()
    expect(result!.binId).toBe('2.1 BDX LB')
    expect(result!.binRuleId).toBe('test/bdx')
    expect(result!.overflowed).toBe(false)
  })

  it('applies highest-priority rule when multiple match', () => {
    const bottle = makeBottle({ country: 'France', region: 'Bordeaux' })
    const result = resolveBin(bottle, 'REMOTE', [frenchRule, bdxRule], makeContext())
    expect(result!.binId).toBe('2.1 BDX LB')
  })

  it('returns null when no rules match', () => {
    const bottle = makeBottle({ country: 'Japan' })
    const result = resolveBin(bottle, 'REMOTE', [frenchRule, bdxRule], makeContext())
    expect(result).toBeNull()
  })

  it('only considers rules for the given location', () => {
    const bottle = makeBottle({ country: 'Italy' })
    const result = resolveBin(bottle, 'REMOTE', [homeItalyRule, italyRule], makeContext())
    expect(result!.binId).toBe('3.8 OVERFLOW')
  })

  it('cascades to overflow when primary bin is full', () => {
    const ctx = makeContext({
      capacity: createCapacityTracker(new Map([
        ['2.1 BDX LB', { current: 20, max: 20 }],
        ['2.6 FR OTHER', { current: 0, max: 20 }],
      ])),
    })
    const bottle = makeBottle({ country: 'France', region: 'Bordeaux' })
    const result = resolveBin(bottle, 'REMOTE', [bdxRule, frenchRule], ctx)
    expect(result!.binId).toBe('2.6 FR OTHER')
    expect(result!.overflowed).toBe(true)
  })

  it('reserves capacity on assignment', () => {
    const cap = createCapacityTracker(new Map([['2.1 BDX LB', { current: 0, max: 20 }]]))
    const ctx = makeContext({ capacity: cap })
    resolveBin(makeBottle(), 'REMOTE', [bdxRule], ctx)
    expect(cap.remaining('2.1 BDX LB')).toBe(19)
  })
})

describe('resolveAllBins — OWC consistency', () => {
  it('all bottles in OWC group get same bin', () => {
    const b1 = makeBottle({ barcode: '001', country: 'France', region: 'Bordeaux', owcGroup: 'CdP-case' })
    const b2 = makeBottle({ barcode: '002', country: 'France', region: 'Champagne', owcGroup: 'CdP-case' })
    const ctx = makeContext({
      allBottles: [b1, b2],
      owcGroups: new Map([['CdP-case', [b1, b2]]]),
    })

    const results = resolveAllBins(
      [{ bottle: b1, location: 'REMOTE' }, { bottle: b2, location: 'REMOTE' }],
      [bdxRule, frenchRule],
      ctx,
    )

    expect(results.get('001')!.binId).toBe('2.1 BDX LB')
    expect(results.get('002')!.binId).toBe('2.1 BDX LB')
    expect(results.get('002')!.binRuleId).toBe('owc-consistency')
  })

  it('batch processes deterministically (OWC first, then by barcode)', () => {
    const b1 = makeBottle({ barcode: '002', country: 'France', region: 'Bordeaux' })
    const b2 = makeBottle({ barcode: '001', country: 'France', region: 'Bordeaux', owcGroup: 'case-1' })
    const ctx = makeContext({ owcGroups: new Map([['case-1', [b2]]]) })

    const results = resolveAllBins(
      [{ bottle: b1, location: 'REMOTE' }, { bottle: b2, location: 'REMOTE' }],
      [bdxRule],
      ctx,
    )

    expect(results.size).toBe(2)
  })
})
