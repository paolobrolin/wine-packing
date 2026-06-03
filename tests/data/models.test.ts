import { describe, it, expect } from 'vitest'
import { needsMove, isOverdue, type DbBottle } from '../../src/data/models'

function makeDbBottle(overrides: Partial<DbBottle> = {}): DbBottle {
  return {
    barcode: '0001', iwine: 1, vintage: '2020', wine: 'Test', producer: 'Test',
    country: 'France', region: 'Bordeaux', size: '750ml', cost: 500, cost_currency: 'SEK',
    begin_consume: 2025, end_consume: 2035,
    current_location: 'Cellar', current_bin: 'Källaren',
    recommended_location: 'REMOTE', recommended_bin: '2.1 BDX LB',
    move_reason: 'midpoint', rule_id: 'midpoint',
    state: 'pending', packed_at: null, in_transit_at: null, shelved_at: null, synced_at: null,
    trip_id: null, owc_group: null,
    ct_location_at_sync: 'Cellar', ct_bin_at_sync: 'Källaren',
    created_at: '2026-06-01T00:00:00Z', updated_at: '2026-06-01T00:00:00Z',
    ...overrides,
  }
}

describe('needsMove', () => {
  it('returns true when current location differs from recommended', () => {
    expect(needsMove(makeDbBottle())).toBe(true)
  })

  it('returns true when location matches but bin differs', () => {
    expect(needsMove(makeDbBottle({ current_location: 'REMOTE', current_bin: 'wrong' }))).toBe(true)
  })

  it('returns false when both match', () => {
    expect(needsMove(makeDbBottle({ current_location: 'REMOTE', current_bin: '2.1 BDX LB' }))).toBe(false)
  })

  it('returns false when recommended_location is null', () => {
    expect(needsMove(makeDbBottle({ recommended_location: null }))).toBe(false)
  })
})

describe('isOverdue', () => {
  const now = new Date('2026-06-04T14:00:00Z')

  it('returns true when packed >2h ago', () => {
    const bottle = makeDbBottle({ state: 'packed', packed_at: '2026-06-04T11:00:00Z' })
    expect(isOverdue(bottle, now)).toBe(true)
  })

  it('returns false when packed <2h ago', () => {
    const bottle = makeDbBottle({ state: 'packed', packed_at: '2026-06-04T13:00:00Z' })
    expect(isOverdue(bottle, now)).toBe(false)
  })

  it('returns true when in_transit >2h ago', () => {
    const bottle = makeDbBottle({ state: 'in_transit', in_transit_at: '2026-06-04T11:00:00Z' })
    expect(isOverdue(bottle, now)).toBe(true)
  })

  it('returns false for pending state', () => {
    const bottle = makeDbBottle({ state: 'pending' })
    expect(isOverdue(bottle, now)).toBe(false)
  })

  it('returns false for shelved state', () => {
    const bottle = makeDbBottle({ state: 'shelved' })
    expect(isOverdue(bottle, now)).toBe(false)
  })

  it('returns false when timestamp is null', () => {
    const bottle = makeDbBottle({ state: 'packed', packed_at: null })
    expect(isOverdue(bottle, now)).toBe(false)
  })

  it('supports custom threshold', () => {
    const bottle = makeDbBottle({ state: 'packed', packed_at: '2026-06-04T13:30:00Z' })
    expect(isOverdue(bottle, now, 15 * 60 * 1000)).toBe(true) // 15 min threshold
  })
})
