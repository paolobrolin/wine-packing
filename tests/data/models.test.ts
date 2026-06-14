import { describe, it, expect } from 'vitest'
import { needsMove, isOverdue, normalizeLocation, moveType, actionLabel, type DbBottle } from '../../src/data/models'

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

  it('returns false when location matches and recommended_bin is null', () => {
    expect(needsMove(makeDbBottle({
      current_location: 'REMOTE',
      current_bin: '1.7 SPOTS + HIRSCH + RIDGE',
      recommended_location: 'REMOTE',
      recommended_bin: null,
    }))).toBe(false)
  })

  it('returns true when location matches but recommended_bin explicitly differs', () => {
    expect(needsMove(makeDbBottle({
      current_location: 'REMOTE',
      current_bin: '1.7 SPOTS + HIRSCH + RIDGE',
      recommended_location: 'REMOTE',
      recommended_bin: '1.8 NEW WORLD OTHER',
    }))).toBe(true)
  })
})

describe('normalizeLocation', () => {
  it('returns REMOTE for "REMOTE"', () => {
    expect(normalizeLocation('REMOTE')).toBe('REMOTE')
  })

  it('returns HOME for null', () => {
    expect(normalizeLocation(null)).toBe('HOME')
  })

  it('returns HOME for "Cellar"', () => {
    expect(normalizeLocation('Cellar')).toBe('HOME')
  })

  it('returns HOME for empty string', () => {
    expect(normalizeLocation('')).toBe('HOME')
  })
})

describe('moveType', () => {
  it('returns cross-location when locations differ', () => {
    expect(moveType(makeDbBottle({ current_location: 'Cellar', recommended_location: 'REMOTE' }))).toBe('cross-location')
  })

  it('returns within-location when same location but different bin', () => {
    expect(moveType(makeDbBottle({
      current_location: null, recommended_location: 'HOME',
      current_bin: 'Kall 2. FRANKRIKE', recommended_bin: 'Lgh 2. FRANKRIKE',
    }))).toBe('within-location')
  })

  it('returns none when recommended_location is null', () => {
    expect(moveType(makeDbBottle({ recommended_location: null }))).toBe('none')
  })

  it('returns none when both location and bin match', () => {
    expect(moveType(makeDbBottle({
      current_location: 'REMOTE', recommended_location: 'REMOTE',
      current_bin: '2.1 BDX LB', recommended_bin: '2.1 BDX LB',
    }))).toBe('none')
  })

  it('returns none when recommended_bin is null (no bin requirement)', () => {
    expect(moveType(makeDbBottle({
      current_location: 'REMOTE', recommended_location: 'REMOTE',
      current_bin: '2.1 BDX LB', recommended_bin: null,
    }))).toBe('none')
  })

  it('returns cross-location for HOME bottle going REMOTE', () => {
    expect(moveType(makeDbBottle({
      current_location: null, recommended_location: 'REMOTE',
      recommended_bin: '3.4 BARBARESCO',
    }))).toBe('cross-location')
  })
})

describe('actionLabel', () => {
  it('returns Pack for pending cross-location', () => {
    expect(actionLabel(makeDbBottle({ state: 'pending', current_location: 'Cellar', recommended_location: 'REMOTE' }))).toBe('Pack')
  })

  it('returns Place for packed bottles', () => {
    expect(actionLabel(makeDbBottle({ state: 'packed' }))).toBe('Place')
  })

  it('returns Place for in_transit bottles', () => {
    expect(actionLabel(makeDbBottle({ state: 'in_transit' }))).toBe('Place')
  })

  it('returns Move for pending within-location', () => {
    expect(actionLabel(makeDbBottle({
      state: 'pending', current_location: null, recommended_location: 'HOME',
      current_bin: 'Kall 2', recommended_bin: 'Lgh 2',
    }))).toBe('Move')
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
