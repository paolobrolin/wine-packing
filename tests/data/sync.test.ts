import { describe, it, expect } from 'vitest'
import { buildSyncRows, type CtBottle } from '../../src/data/sync'

function makeCtBottle(overrides: Partial<CtBottle> = {}): CtBottle {
  return {
    barcode: '0001',
    iwine: 1,
    size: '750ml',
    location: null,
    bin: null,
    bottle_cost: 500,
    bottle_cost_currency: 'SEK',
    begin_consume: 2025,
    end_consume: 2045,
    bottle_note: null,
    purchase_note: null,
    extra: {
      Vintage: '2020',
      Wine: 'Test Wine',
      Producer: 'Test Producer',
      Country: 'France',
      Region: 'Bordeaux',
    },
    ...overrides,
  }
}

describe('buildSyncRows', () => {
  it('sets recommended_location for bottles not yet at destination', () => {
    const ct = makeCtBottle({ location: null, begin_consume: 2025, end_consume: 2045 })
    const { rows, stats } = buildSyncRows([ct], new Map(), 2026)

    expect(rows[0].recommended_location).toBe('REMOTE')
    expect(stats.needsMove).toBe(1)
    expect(stats.alreadyAtDestination).toBe(0)
  })

  it('clears recommendation when bottle is already at REMOTE', () => {
    const ct = makeCtBottle({
      location: 'REMOTE',
      bin: '1.7 SPOTS + HIRSCH + RIDGE',
      begin_consume: 2025,
      end_consume: 2045,
    })
    const { rows, stats } = buildSyncRows([ct], new Map(), 2026)

    expect(rows[0].recommended_location).toBeNull()
    expect(rows[0].recommended_bin).toBeNull()
    expect(rows[0].move_reason).toBeNull()
    expect(stats.alreadyAtDestination).toBe(1)
    expect(stats.needsMove).toBe(0)
  })

  it('does not set recommendation for HOME bottles', () => {
    const ct = makeCtBottle({ begin_consume: 2024, end_consume: 2028 })
    const { rows, stats } = buildSyncRows([ct], new Map(), 2026)

    expect(rows[0].recommended_location).toBeNull()
    expect(stats.home).toBe(1)
  })

  it('preserves existing state for known bottles', () => {
    const ct = makeCtBottle({ location: null, begin_consume: 2025, end_consume: 2045 })
    const existing = new Map([['0001', {
      state: 'packed' as const,
      packed_at: '2026-06-01T10:00:00Z',
      in_transit_at: null,
      shelved_at: null,
      synced_at: null,
      trip_id: 'trip-1',
      owc_group: null,
    }]])
    const { rows } = buildSyncRows([ct], existing, 2026)

    expect(rows[0].state).toBe('packed')
    expect(rows[0].packed_at).toBe('2026-06-01T10:00:00Z')
    expect(rows[0].trip_id).toBe('trip-1')
  })

  it('defaults new bottles to pending', () => {
    const ct = makeCtBottle({ location: null, begin_consume: 2025, end_consume: 2045 })
    const { rows } = buildSyncRows([ct], new Map(), 2026)

    expect(rows[0].state).toBe('pending')
  })

  it('marks already-at-destination bottles as synced', () => {
    const ct = makeCtBottle({
      location: 'REMOTE',
      bin: '2.1 BDX LB',
      begin_consume: 2025,
      end_consume: 2045,
    })
    const { rows } = buildSyncRows([ct], new Map(), 2026)

    expect(rows[0].state).toBe('synced')
    expect(rows[0].recommended_location).toBeNull()
  })

  it('copies CT location/bin to ct_*_at_sync fields', () => {
    const ct = makeCtBottle({ location: 'REMOTE', bin: '1.2 OWC' })
    const { rows } = buildSyncRows([ct], new Map(), 2026)

    expect(rows[0].ct_location_at_sync).toBe('REMOTE')
    expect(rows[0].ct_bin_at_sync).toBe('1.2 OWC')
  })

  it('treats begin_consume=9999 as null (CT sentinel for "not set")', () => {
    const ct = makeCtBottle({ begin_consume: 9999, end_consume: 2028 })
    const { rows } = buildSyncRows([ct], new Map(), 2026)

    expect(rows[0].begin_consume).toBeNull()
    // midpoint with null begin: min(2026, 2028)=2026, mp=(2026+2028)/2=2027 → HOME
    expect(rows[0].recommended_location).toBeNull()
  })

  it('treats end_consume=9999 as null', () => {
    const ct = makeCtBottle({ begin_consume: 2025, end_consume: 9999 })
    const { rows } = buildSyncRows([ct], new Map(), 2026)

    expect(rows[0].end_consume).toBeNull()
    // with null end: end=2025+10=2035, mp=(2025+2035)/2=2030 → REMOTE
    expect(rows[0].recommended_location).toBe('REMOTE')
  })

  it('classifies 9999-begin bottle with short window as HOME, not REMOTE', () => {
    // Fontanafredda 1998, end=2028: should be HOME
    const ct = makeCtBottle({ begin_consume: 9999, end_consume: 2028 })
    const { rows, stats } = buildSyncRows([ct], new Map(), 2026)

    expect(rows[0].recommended_location).toBeNull()
    expect(stats.home).toBe(1)
    expect(stats.needsMove).toBe(0)
  })

  it('classifies 9999-begin bottle with long window as REMOTE', () => {
    // Roederer 2018, end=2043: should still be REMOTE
    const ct = makeCtBottle({ begin_consume: 9999, end_consume: 2043 })
    const { rows } = buildSyncRows([ct], new Map(), 2026)

    expect(rows[0].recommended_location).toBe('REMOTE')
  })
})
