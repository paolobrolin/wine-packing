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
      Type: null,
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

  it('assigns HOME placement with bin for HOME bottles', () => {
    const ct = makeCtBottle({
      begin_consume: 2024, end_consume: 2028,
      extra: { Vintage: '2020', Wine: 'Test Wine', Producer: 'Test', Country: 'France', Region: 'Burgundy', Type: null },
    })
    const { rows } = buildSyncRows([ct], new Map(), 2026)

    expect(rows[0].recommended_location).toBe('HOME')
    expect(rows[0].recommended_bin).not.toBeNull()
  })

  it('HOME bottle already at correct bin is synced (no action)', () => {
    const ct = makeCtBottle({
      begin_consume: 2024, end_consume: 2028, location: 'Cellar', bin: 'Lgh 2. FRANKRIKE',
      extra: { Vintage: '2020', Wine: 'Test Bordeaux', Producer: 'Test', Country: 'France', Region: 'Burgundy', Type: null },
    })
    const { rows } = buildSyncRows([ct], new Map(), 2026)

    expect(rows[0].recommended_location).toBe('HOME')
    expect(rows[0].state).toBe('synced')
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

  it('returns orphaned barcodes for deletion', () => {
    const ct = makeCtBottle({ barcode: '0001', begin_consume: 2025, end_consume: 2045 })
    const existing = new Map([
      ['0001', { state: 'pending' as const, packed_at: null, in_transit_at: null, shelved_at: null, synced_at: null, trip_id: null, owc_group: null }],
      ['0002', { state: 'pending' as const, packed_at: null, in_transit_at: null, shelved_at: null, synced_at: null, trip_id: null, owc_group: null }],
      ['0003', { state: 'packed' as const, packed_at: '2026-06-01T00:00:00Z', in_transit_at: null, shelved_at: null, synced_at: null, trip_id: null, owc_group: null }],
    ])
    const { stats } = buildSyncRows([ct], existing, 2026)
    expect(stats.deleted).toBe(2)
    expect(stats.orphanedBarcodes).toEqual(['0002', '0003'])
  })

  it('does not flag CT bottles as orphaned', () => {
    const ct = makeCtBottle({ barcode: '0001' })
    const existing = new Map([
      ['0001', { state: 'pending' as const, packed_at: null, in_transit_at: null, shelved_at: null, synced_at: null, trip_id: null, owc_group: null }],
    ])
    const { stats } = buildSyncRows([ct], existing, 2026)
    expect(stats.deleted).toBe(0)
    expect(stats.orphanedBarcodes).toEqual([])
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
    expect(rows[0].recommended_location).toBe('HOME')
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

    expect(rows[0].recommended_location).toBe('HOME')
    expect(stats.needsMove).toBe(0)
  })

  it('classifies 9999-begin bottle with long window as REMOTE', () => {
    // Roederer 2018, end=2043: should still be REMOTE
    const ct = makeCtBottle({ begin_consume: 9999, end_consume: 2043 })
    const { rows } = buildSyncRows([ct], new Map(), 2026)

    expect(rows[0].recommended_location).toBe('REMOTE')
  })

  it('uses costOverrides for 0-cost bottles (kitchen rule respects enriched price)', () => {
    // Without override: cost=0, end=2027 → kitchen (HOME, Köket)
    const ct = makeCtBottle({
      bottle_cost: 0,
      begin_consume: 2024,
      end_consume: 2027,
      extra: { Vintage: '2013', Wine: 'Voerzio Barolo La Serra', Producer: 'Voerzio Martini', Country: 'Italy', Region: 'Piedmont', Type: null },
    })
    const withoutOverride = buildSyncRows([ct], new Map(), 2026)
    expect(withoutOverride.rows[0].cost).toBe(0)
    expect(withoutOverride.rows[0].recommended_bin).toBe('Köket')

    // With override: cost=603 → too expensive for kitchen
    const overrides = new Map([[ct.iwine, 603]])
    const withOverride = buildSyncRows([ct], new Map(), 2026, overrides)
    expect(withOverride.rows[0].cost).toBe(603)
    expect(withOverride.rows[0].recommended_bin).not.toBe('Köket')
  })

  it('does not override non-zero costs', () => {
    const ct = makeCtBottle({ bottle_cost: 299, begin_consume: 2024, end_consume: 2027 })
    const overrides = new Map([[ct.iwine, 999]])
    const { rows } = buildSyncRows([ct], new Map(), 2026, overrides)

    expect(rows[0].cost).toBe(299)
  })

  it('gives Fortified wines a HOME bin with Lgh/Kall prefix (Don PX bug)', () => {
    const ct = makeCtBottle({
      location: 'Cellar',
      begin_consume: 2019,
      end_consume: 2042,
      bottle_cost: 399,
      extra: { Vintage: '2003', Wine: 'Bodegas Toro Albalá Don PX', Producer: 'Bodegas Toro Albalá', Country: 'Spain', Region: 'Andalucía', Type: 'White - Fortified' },
    })
    const { rows } = buildSyncRows([ct], new Map(), 2026)

    expect(rows[0].recommended_location).toBe('HOME')
    expect(rows[0].recommended_bin).toMatch(/^(Lgh|Kall) 7\. SOTA \+ STARKVIN$/)
  })
})
