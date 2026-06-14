import { describe, it, expect } from 'vitest'
import { canTransition, transition, timestampField, inferTransition, reverseTransition, type BottleState } from '../../src/rules/state-machine'
import type { DbBottle } from '../../src/data/models'

function makeDbBottle(overrides: Partial<DbBottle> = {}): DbBottle {
  return {
    barcode: '0001', iwine: 1, vintage: '2020', wine: 'Test', producer: 'Test',
    country: 'France', region: 'Bordeaux', size: '750ml', cost: 500, cost_currency: 'SEK', wine_type: null,
    begin_consume: 2025, end_consume: 2035,
    current_location: 'Cellar', current_bin: 'Källaren',
    recommended_location: 'REMOTE', recommended_bin: '2.1 BDX LB',
    move_reason: 'midpoint', rule_id: 'midpoint',
    state: 'pending', packed_at: null, in_transit_at: null, shelved_at: null, synced_at: null,
    trip_id: null, owc_group: null,
    ct_location_at_sync: null, ct_bin_at_sync: null,
    created_at: '', updated_at: '',
    ...overrides,
  }
}

describe('canTransition', () => {
  const valid: [BottleState, BottleState][] = [
    ['pending', 'packed'],
    ['pending', 'synced'],
    ['packed', 'in_transit'],
    ['packed', 'pending'],
    ['packed', 'shelved'],
    ['in_transit', 'shelved'],
    ['in_transit', 'packed'],
    ['shelved', 'synced'],
    ['shelved', 'packed'],
    ['synced', 'pending'],
  ]
  valid.forEach(([from, to]) => {
    it(`allows ${from} → ${to}`, () => expect(canTransition(from, to)).toBe(true))
  })

  const invalid: [BottleState, BottleState][] = [
    ['pending', 'in_transit'],
    ['pending', 'shelved'],
    ['packed', 'synced'],
    ['in_transit', 'pending'],
    ['in_transit', 'synced'],
    ['shelved', 'pending'],
    ['synced', 'packed'],
  ]
  invalid.forEach(([from, to]) => {
    it(`blocks ${from} → ${to}`, () => expect(canTransition(from, to)).toBe(false))
  })
})

describe('transition', () => {
  it('returns the new state on valid transition', () => {
    expect(transition('pending', 'packed')).toBe('packed')
  })

  it('throws on invalid transition', () => {
    expect(() => transition('pending', 'shelved')).toThrow('Invalid transition: pending → shelved')
  })
})

describe('inferTransition', () => {
  it('pending cross-location → packed', () => {
    const b = makeDbBottle({ state: 'pending', current_location: 'Cellar', recommended_location: 'REMOTE' })
    expect(inferTransition(b)).toBe('packed')
  })

  it('pending within-location → synced', () => {
    const b = makeDbBottle({ state: 'pending', current_location: null, recommended_location: 'HOME', current_bin: 'Kall 2', recommended_bin: 'Lgh 2' })
    expect(inferTransition(b)).toBe('synced')
  })

  it('packed → shelved', () => {
    const b = makeDbBottle({ state: 'packed' })
    expect(inferTransition(b)).toBe('shelved')
  })

  it('in_transit → shelved', () => {
    const b = makeDbBottle({ state: 'in_transit' })
    expect(inferTransition(b)).toBe('shelved')
  })

  it('throws for shelved (no forward transition)', () => {
    const b = makeDbBottle({ state: 'shelved' })
    expect(() => inferTransition(b)).toThrow()
  })

  it('throws for synced (no forward transition)', () => {
    const b = makeDbBottle({ state: 'synced' })
    expect(() => inferTransition(b)).toThrow()
  })

  it('throws for pending with no move needed', () => {
    const b = makeDbBottle({ state: 'pending', recommended_location: null })
    expect(() => inferTransition(b)).toThrow()
  })
})

describe('reverseTransition', () => {
  it('packed → pending', () => expect(reverseTransition('packed')).toBe('pending'))
  it('shelved → packed', () => expect(reverseTransition('shelved')).toBe('packed'))
  it('synced → pending', () => expect(reverseTransition('synced')).toBe('pending'))
  it('in_transit → packed', () => expect(reverseTransition('in_transit')).toBe('packed'))
  it('throws for pending (no reverse)', () => expect(() => reverseTransition('pending')).toThrow())
})

describe('timestampField', () => {
  it('returns null for pending', () => expect(timestampField('pending')).toBeNull())
  it('returns packed_at for packed', () => expect(timestampField('packed')).toBe('packed_at'))
  it('returns in_transit_at for in_transit', () => expect(timestampField('in_transit')).toBe('in_transit_at'))
  it('returns shelved_at for shelved', () => expect(timestampField('shelved')).toBe('shelved_at'))
  it('returns synced_at for synced', () => expect(timestampField('synced')).toBe('synced_at'))
})
