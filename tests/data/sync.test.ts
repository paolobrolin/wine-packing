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

  it('a bottle at REMOTE on its shelf gets that shelf as recommendation and is done', () => {
    const ct = makeCtBottle({
      location: 'REMOTE',
      bin: '3.8 FR OTHER',
      begin_consume: 2025,
      end_consume: 2045,
    })
    const { rows, stats } = buildSyncRows([ct], new Map(), 2026)

    expect(rows[0].recommended_location).toBe('REMOTE')
    expect(rows[0].recommended_bin).toBe('3.8 FR OTHER')
    expect(rows[0].state).toBe('synced')
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
      begin_consume: 2024, end_consume: 2028, location: 'Cellar', bin: 'Lgh 4. FRANKRIKE',
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

  it('a bottle at REMOTE on another shelf than the rules say is a move within REMOTE', () => {
    const ct = makeCtBottle({
      location: 'REMOTE',
      bin: '2.1 BDX LB',
      begin_consume: 2025,
      end_consume: 2045,
    })
    const { rows } = buildSyncRows([ct], new Map(), 2026)

    expect(rows[0].state).toBe('pending')
    expect(rows[0].recommended_location).toBe('REMOTE')
    expect(rows[0].recommended_bin).toBe('3.8 FR OTHER')
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
    const ct = makeCtBottle({
      bottle_cost: 0,
      begin_consume: 2024,
      end_consume: 2027,
      extra: { Vintage: '2013', Wine: 'Voerzio Barolo La Serra', Producer: 'Voerzio Martini', Country: 'Italy', Region: 'Piedmont', Type: null },
    })

    // No override: värdet är okänt, inte lågt → köket avstår
    const withoutOverride = buildSyncRows([ct], new Map(), 2026)
    expect(withoutOverride.rows[0].cost).toBe(0)
    expect(withoutOverride.rows[0].estimated_value).toBeNull()
    expect(withoutOverride.rows[0].recommended_bin).not.toBe('Köket')

    // Lågt värde hämtat → nu är det positivt känt att vinet är billigt
    const cheap = buildSyncRows([ct], new Map(), 2026, new Map([[ct.iwine, 150]]))
    expect(cheap.rows[0].estimated_value).toBe(150)
    expect(cheap.rows[0].recommended_bin).toBe('Köket')

    // Högt värde hämtat → för dyrt för köket
    const withOverride = buildSyncRows([ct], new Map(), 2026, new Map([[ct.iwine, 603]]))
    expect(withOverride.rows[0].cost).toBe(0)
    expect(withOverride.rows[0].estimated_value).toBe(603)
    expect(withOverride.rows[0].value_source).toBe('ct_auction')
    expect(withOverride.rows[0].recommended_bin).not.toBe('Köket')
  })

  it('preserves existing estimated_value when no new override', () => {
    const ct = makeCtBottle({ bottle_cost: 0, begin_consume: 2024, end_consume: 2027 })
    const existing = new Map([[ct.barcode, {
      state: 'pending' as const, packed_at: null, in_transit_at: null,
      shelved_at: null, synced_at: null, trip_id: null, owc_group: null,
      estimated_value: 500, value_source: 'web_search',
    }]])
    const { rows } = buildSyncRows([ct], existing, 2026)

    expect(rows[0].cost).toBe(0)
    expect(rows[0].estimated_value).toBe(500)
    expect(rows[0].value_source).toBe('web_search')
    expect(rows[0].recommended_bin).not.toBe('Köket')
  })

  it('does not set estimated_value for non-zero costs', () => {
    const ct = makeCtBottle({ bottle_cost: 299, begin_consume: 2024, end_consume: 2027 })
    const overrides = new Map([[ct.iwine, 999]])
    const { rows } = buildSyncRows([ct], new Map(), 2026, overrides)

    expect(rows[0].cost).toBe(299)
    expect(rows[0].estimated_value).toBeNull()
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
    expect(rows[0].recommended_bin).toBe('Lgh 2. SOTA + STARKVIN')
  })
})

describe('buildSyncRows — keep-locations', () => {
  it('leaves Ekholmen bottles without any recommendation', () => {
    const ct = makeCtBottle({ location: 'Ekholmen', begin_consume: 2025, end_consume: 2045 })
    const { rows } = buildSyncRows([ct], new Map(), 2026)

    expect(rows[0].recommended_location).toBeNull()
    expect(rows[0].recommended_bin).toBeNull()
  })

  it('leaves Lugnet bottles alone even when Lugnet is in the bin field', () => {
    // CT encodes Lugnet as location=Cellar + bin=Lugnet for 58 bottles
    const ct = makeCtBottle({ location: 'Cellar', bin: 'Lugnet', begin_consume: 2025, end_consume: 2045 })
    const { rows } = buildSyncRows([ct], new Map(), 2026)

    expect(rows[0].recommended_location).toBeNull()
    expect(rows[0].recommended_bin).toBeNull()
  })

  it('leaves Lotten i CA bottles without a home bin', () => {
    const ct = makeCtBottle({ location: 'Lotten i CA', country: 'USA' } as Partial<CtBottle>)
    const { rows } = buildSyncRows([ct], new Map(), 2026)

    expect(rows[0].recommended_bin).toBeNull()
  })

  it('leaves GSN | Wine Storage bottles alone (commercial storage in Napa)', () => {
    const ct = makeCtBottle({
      location: 'GSN | Wine Storage',
      extra: { Vintage: '2023', Wine: 'Kistler Chardonnay Trenton Roadhouse', Producer: 'Kistler', Country: 'USA', Region: 'California', Type: 'White' },
    })
    const { rows } = buildSyncRows([ct], new Map(), 2026)

    expect(rows[0].recommended_location).toBeNull()
    expect(rows[0].recommended_bin).toBeNull()
  })

  it('still places ordinary Cellar bottles', () => {
    const ct = makeCtBottle({ location: 'Cellar', bin: null, begin_consume: 2025, end_consume: 2045 })
    const { rows } = buildSyncRows([ct], new Map(), 2026)

    expect(rows[0].recommended_location).not.toBeNull()
  })
})

describe('buildSyncRows — label_ref', () => {
  it('writes label_ref from the per-wine lookup', () => {
    const ct = makeCtBottle({ iwine: 4822336 })
    const labels = new Map([[4822336, 'labels/530f1583-0277-46b1-acb5-78c51590a265']])
    const { rows } = buildSyncRows([ct], new Map(), 2026, undefined, labels)

    expect(rows[0].label_ref).toBe('labels/530f1583-0277-46b1-acb5-78c51590a265')
  })

  it('leaves label_ref null when the wine has no label', () => {
    const { rows } = buildSyncRows([makeCtBottle({ iwine: 999 })], new Map(), 2026, undefined, new Map())
    expect(rows[0].label_ref).toBeNull()
  })

  it('preserves an existing label_ref when no lookup is supplied', () => {
    const ct = makeCtBottle({ iwine: 4822336 })
    const existing = new Map([[ct.barcode, {
      state: 'pending' as const, packed_at: null, in_transit_at: null, shelved_at: null,
      synced_at: null, trip_id: null, owc_group: null, estimated_value: null, value_source: null,
      label_ref: 'labels/530f1583-0277-46b1-acb5-78c51590a265',
    }]])
    const { rows } = buildSyncRows([ct], existing, 2026)

    expect(rows[0].label_ref).toBe('labels/530f1583-0277-46b1-acb5-78c51590a265')
  })

  it('lets a fresh lookup override a stale stored value', () => {
    const ct = makeCtBottle({ iwine: 4822336 })
    const existing = new Map([[ct.barcode, {
      state: 'pending' as const, packed_at: null, in_transit_at: null, shelved_at: null,
      synced_at: null, trip_id: null, owc_group: null, estimated_value: null, value_source: null,
      label_ref: 'labels/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    }]])
    const labels = new Map([[4822336, 'labels/bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb']])
    const { rows } = buildSyncRows([ct], existing, 2026, undefined, labels)

    expect(rows[0].label_ref).toBe('labels/bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb')
  })
})

describe('buildSyncRows — app placements not yet in CT', () => {
  // A row as the app leaves it after a placement: current_* says where the
  // bottle is, ct_*_at_sync says what CT had at the last sync.
  function existingRow(overrides: Record<string, unknown> = {}) {
    return {
      state: 'synced', packed_at: null, in_transit_at: null, shelved_at: null,
      synced_at: '2026-10-28T08:00:00Z', trip_id: null, owc_group: null,
      estimated_value: null, value_source: null, label_ref: null,
      current_location: 'Cellar', current_bin: 'Lgh 5. BUBBEL',
      ct_location_at_sync: 'Cellar', ct_bin_at_sync: null,
      ...overrides,
    } as never
  }

  it('keeps the bin set in the app while CT still has the old value', () => {
    const ct = makeCtBottle({ location: 'Cellar', bin: null })
    const { rows } = buildSyncRows([ct], new Map([['0001', existingRow()]]), 2026)
    expect(rows[0].current_bin).toBe('Lgh 5. BUBBEL')
    expect(rows[0].current_location).toBe('Cellar')
    expect(rows[0].ct_bin_at_sync).toBeNull()
  })

  it('lets CT win once CT itself has changed since the last sync', () => {
    const ct = makeCtBottle({ location: 'Cellar', bin: 'Köket' })
    const { rows } = buildSyncRows([ct], new Map([['0001', existingRow()]]), 2026)
    expect(rows[0].current_bin).toBe('Köket')
    expect(rows[0].ct_bin_at_sync).toBe('Köket')
  })

  it('derives REMOTE from a remote bin when the app only changed the bin (real app write)', () => {
    const ct = makeCtBottle({ location: 'Cellar', bin: 'Lagringsskåp: 3. Saxum / Andremily' })
    const existing = existingRow({
      state: 'shelved', current_location: 'Cellar', current_bin: '2.6 FR OTHER',
      ct_location_at_sync: 'Cellar', ct_bin_at_sync: 'Lagringsskåp: 3. Saxum / Andremily',
    })
    const { rows } = buildSyncRows([ct], new Map([['0001', existing]]), 2026)
    expect(rows[0].current_location).toBe('REMOTE')
    expect(rows[0].current_bin).toBe('2.6 FR OTHER')
  })

  it('derives Cellar from a home bin for a bottle shelved home from REMOTE, so it shows at home', () => {
    // Drinking window open now → recommended HOME; the app shelved it in Lgh 2.
    const ct = makeCtBottle({ location: 'REMOTE', bin: '2.6 FR OTHER', begin_consume: 2020, end_consume: 2027,
      extra: { Vintage: '2018', Wine: 'Test Bourgogne', Producer: 'Test', Country: 'France', Region: 'Burgundy', Type: 'Red' } })
    const existing = existingRow({
      state: 'shelved', current_location: 'REMOTE', current_bin: 'Lgh 2. FRANKRIKE',
      ct_location_at_sync: 'REMOTE', ct_bin_at_sync: '2.6 FR OTHER',
    })
    const { rows } = buildSyncRows([ct], new Map([['0001', existing]]), 2026)
    expect(rows[0].current_location).toBe('Cellar')
    expect(rows[0].current_bin).toBe('Lgh 2. FRANKRIKE')
  })

  it('derives Cellar for any non-remote bin, incl. Källaren overflow names not in HOME_BINS', () => {
    const ct = makeCtBottle({ location: 'REMOTE', bin: '2.7 DE MOSEL' })
    const existing = existingRow({
      state: 'shelved', current_location: 'REMOTE', current_bin: 'Kall 6. VITA',
      ct_location_at_sync: 'REMOTE', ct_bin_at_sync: '2.7 DE MOSEL',
    })
    const { rows } = buildSyncRows([ct], new Map([['0001', existing]]), 2026)
    expect(rows[0].current_location).toBe('Cellar')
    expect(rows[0].current_bin).toBe('Kall 6. VITA')
  })

  it('feeds the kept position to the rules (a bottle shelved at REMOTE is no longer a move)', () => {
    const ct = makeCtBottle({ location: 'Cellar', bin: null, begin_consume: 2030, end_consume: 2045 })
    const withoutApp = buildSyncRows([ct], new Map(), 2026).rows[0]
    expect(withoutApp.recommended_location).toBe('REMOTE')
    const existing = existingRow({ state: 'shelved', current_location: 'Cellar', current_bin: '3.8 FR OTHER', ct_bin_at_sync: null })
    const { rows } = buildSyncRows([ct], new Map([['0001', existing]]), 2026)
    expect(rows[0].current_location).toBe('REMOTE')
    expect(rows[0].recommended_bin).toBe('3.8 FR OTHER')
    expect(rows[0].state).toBe('synced')
  })

  it('treats an empty-string bin like no bin (no spurious app move)', () => {
    const ct = makeCtBottle({ location: 'Cellar', bin: 'Köket' })
    const existing = existingRow({ current_bin: '', ct_bin_at_sync: 'Köket' })
    const { rows } = buildSyncRows([ct], new Map([['0001', existing]]), 2026)
    expect(rows[0].current_bin).toBe('Köket')
  })

  it('keeps a shelved move to REMOTE, location included', () => {
    const ct = makeCtBottle({ location: 'Cellar', bin: 'Lagringsskåp: 3. Saxum / Andremily' })
    const existing = existingRow({
      state: 'shelved', current_location: 'REMOTE', current_bin: '1.6 CALIFORNIA OTHER',
      ct_location_at_sync: 'Cellar', ct_bin_at_sync: 'Lagringsskåp: 3. Saxum / Andremily',
    })
    const { rows } = buildSyncRows([ct], new Map([['0001', existing]]), 2026)
    expect(rows[0].current_location).toBe('REMOTE')
    expect(rows[0].current_bin).toBe('1.6 CALIFORNIA OTHER')
    expect(rows[0].ct_location_at_sync).toBe('Cellar')
  })

  it('does not keep the bin of a packed bottle (it is in a box, not on the shelf)', () => {
    const ct = makeCtBottle({ location: 'Cellar', bin: null })
    const existing = existingRow({ state: 'packed', current_bin: '3.3 BAROLO CLASSIC' })
    const { rows } = buildSyncRows([ct], new Map([['0001', existing]]), 2026)
    expect(rows[0].current_bin).toBeNull()
    expect(rows[0].state).toBe('packed')
  })

  it('falls back to CT when the row has no record of what CT had', () => {
    const ct = makeCtBottle({ location: 'Cellar', bin: null })
    const existing = existingRow({ ct_location_at_sync: undefined, ct_bin_at_sync: undefined })
    const { rows } = buildSyncRows([ct], new Map([['0001', existing]]), 2026)
    expect(rows[0].current_bin).toBeNull()
  })
})

describe('buildSyncRows — done bottles get a new recommendation', () => {
  function doneRow(overrides: Record<string, unknown> = {}) {
    return {
      state: 'synced', packed_at: null, in_transit_at: null, shelved_at: null,
      synced_at: '2026-06-24T10:00:00Z', trip_id: null, owc_group: null,
      estimated_value: null, value_source: null, label_ref: null,
      current_location: 'Cellar', current_bin: 'Källaren',
      ct_location_at_sync: 'Cellar', ct_bin_at_sync: 'Källaren',
      recommended_location: null, recommended_bin: null,
      ...overrides,
    } as never
  }
  // Window 2030–2045 at year 2026 → the rules say REMOTE.
  const ct = () => makeCtBottle({ location: 'Cellar', bin: 'Källaren', begin_consume: 2030, end_consume: 2045 })

  it('goes back to pending when the recommendation changed since it was marked done', () => {
    const { rows } = buildSyncRows([ct()], new Map([['0001', doneRow()]]), 2026)
    expect(rows[0].recommended_location).toBe('REMOTE')
    expect(rows[0].state).toBe('pending')
  })

  it('stays done when the recommendation is unchanged (a deliberate placement elsewhere)', () => {
    const first = buildSyncRows([ct()], new Map(), 2026).rows[0]
    const existing = doneRow({ recommended_location: first.recommended_location, recommended_bin: first.recommended_bin })
    const { rows } = buildSyncRows([ct()], new Map([['0001', existing]]), 2026)
    expect(rows[0].state).toBe('synced')
  })

  it('stays done when the row has no record of its previous recommendation', () => {
    const existing = doneRow({ recommended_location: undefined, recommended_bin: undefined })
    const { rows } = buildSyncRows([ct()], new Map([['0001', existing]]), 2026)
    expect(rows[0].state).toBe('synced')
  })

  it('does not touch packed bottles', () => {
    const { rows } = buildSyncRows([ct()], new Map([['0001', doneRow({ state: 'packed' })]]), 2026)
    expect(rows[0].state).toBe('packed')
  })

  it('does not reopen while the app position is still waiting for CT (so the next sync keeps it)', () => {
    // Done in the app at Köket; CT still says Källaren. The rules now want REMOTE.
    const existing = doneRow({ current_bin: 'Köket', recommended_location: 'HOME', recommended_bin: 'Köket' })
    const { rows } = buildSyncRows([ct()], new Map([['0001', existing]]), 2026)
    expect(rows[0].state).toBe('synced')
    expect(rows[0].current_bin).toBe('Köket')
  })

  it('keeps the stored recommendation while waiting for CT, then reopens once CT has caught up', () => {
    // Done in the app at Köket (CT still Källaren); stored recommendation HOME/Köket.
    const existing = doneRow({ current_bin: 'Köket', recommended_location: 'HOME', recommended_bin: 'Köket' })
    // Sync 1: CT unchanged in position, the rules now want REMOTE.
    const s1 = buildSyncRows([ct()], new Map([['0001', existing]]), 2026).rows[0]
    expect(s1.state).toBe('synced')
    expect(s1.recommended_location).toBe('HOME')
    expect(s1.recommended_bin).toBe('Köket')
    // Sync 2: CT now has Köket (written back). The change is still seen.
    const ct2 = makeCtBottle({ location: 'Cellar', bin: 'Köket', begin_consume: 2030, end_consume: 2045 })
    const s2 = buildSyncRows([ct2], new Map([['0001', { ...existing, ...s1 } as never]]), 2026).rows[0]
    expect(s2.recommended_location).toBe('REMOTE')
    expect(s2.state).toBe('pending')
  })

  // A bottle at its REMOTE destination is stored with recommendation null
  // ("already there"), which is not an older recommendation.
  function atRemoteRow(overrides: Record<string, unknown> = {}) {
    return doneRow({ current_location: 'REMOTE', current_bin: '2.1 BDX LB', ct_location_at_sync: 'REMOTE', ct_bin_at_sync: '2.1 BDX LB',
      recommended_location: null, recommended_bin: null, ...overrides })
  }

  it('a done bottle taken home from its REMOTE destination is not reopened when the rules still say REMOTE', () => {
    const ctHome = makeCtBottle({ location: 'Cellar', bin: 'Köket', begin_consume: 2030, end_consume: 2045 })
    const { rows } = buildSyncRows([ctHome], new Map([['0001', atRemoteRow()]]), 2026)
    expect(rows[0].recommended_location).toBe('REMOTE')
    expect(rows[0].state).toBe('synced')
  })

  it('a done bottle at its REMOTE destination is reopened when the rules now want it HOME', () => {
    const ctRemote = makeCtBottle({ location: 'REMOTE', bin: '2.1 BDX LB', begin_consume: 2020, end_consume: 2027 })
    const { rows } = buildSyncRows([ctRemote], new Map([['0001', atRemoteRow()]]), 2026)
    expect(rows[0].recommended_location).toBe('HOME')
    expect(rows[0].state).toBe('pending')
  })

  it('a done bottle that leaves a keep place (Ekholmen) is reopened when the rules now give it a home bin', () => {
    const existing = doneRow({ current_location: 'Ekholmen', current_bin: null, ct_location_at_sync: 'Ekholmen', ct_bin_at_sync: null, recommended_location: null, recommended_bin: null })
    const ctBack = makeCtBottle({ location: 'Cellar', bin: null, begin_consume: 2020, end_consume: 2027 })
    const { rows } = buildSyncRows([ctBack], new Map([['0001', existing]]), 2026)
    expect(rows[0].recommended_location).toBe('HOME')
    expect(rows[0].state).toBe('pending')
  })

  it('same for Lugnet, which lives in the bin field', () => {
    const existing = doneRow({ current_bin: 'Lugnet', ct_location_at_sync: 'Cellar', ct_bin_at_sync: 'Lugnet', recommended_location: null, recommended_bin: null })
    const ctBack = makeCtBottle({ location: 'Cellar', bin: 'Källaren', begin_consume: 2020, end_consume: 2027 })
    const { rows } = buildSyncRows([ctBack], new Map([['0001', existing]]), 2026)
    expect(rows[0].state).toBe('pending')
  })

  // New shelf layout: done bottles at REMOTE were stored with recommendation
  // null ("at destination"); the first sync with shelf rules for REMOTE must
  // turn the ones on an old shelf into moves.
  it('a done bottle at REMOTE on an old shelf becomes a move once REMOTE has shelf rules', () => {
    const existing = atRemoteRow({ current_bin: '2.6 FR OTHER', ct_bin_at_sync: '2.6 FR OTHER' })
    const ctRemote = makeCtBottle({ location: 'REMOTE', bin: '2.6 FR OTHER', begin_consume: 2030, end_consume: 2045 })
    const { rows } = buildSyncRows([ctRemote], new Map([['0001', existing]]), 2026)
    expect(rows[0].recommended_bin).toBe('3.8 FR OTHER')
    expect(rows[0].state).toBe('pending')
  })

  it('a done bottle moved to another REMOTE shelf in CT stays done (a deliberate move)', () => {
    const existing = atRemoteRow({ current_bin: '3.8 FR OTHER', ct_bin_at_sync: '3.8 FR OTHER', recommended_location: 'REMOTE', recommended_bin: '3.8 FR OTHER' })
    const ctMoved = makeCtBottle({ location: 'REMOTE', bin: '2.7 BDX LB', begin_consume: 2030, end_consume: 2045 })
    const { rows } = buildSyncRows([ctMoved], new Map([['0001', existing]]), 2026)
    expect(rows[0].current_bin).toBe('2.7 BDX LB')
    expect(rows[0].state).toBe('synced')
  })

  it('a bottle shelved at REMOTE on a neighbouring shelf becomes done once CT has that shelf', () => {
    // Shelved by hand on 2.7 while the rules say 3.8; CT was then written back to 2.7.
    const existing = atRemoteRow({ state: 'shelved', current_bin: '2.7 BDX LB', ct_bin_at_sync: '2.6 FR OTHER', recommended_location: 'REMOTE', recommended_bin: '3.8 FR OTHER' })
    const ctWritten = makeCtBottle({ location: 'REMOTE', bin: '2.7 BDX LB', begin_consume: 2030, end_consume: 2045 })
    const { rows } = buildSyncRows([ctWritten], new Map([['0001', existing]]), 2026)
    expect(rows[0].state).toBe('synced')
    expect(rows[0].current_bin).toBe('2.7 BDX LB')
  })

  it('counts a bottle at REMOTE on the wrong shelf as a move in the stats, not as in place', () => {
    const existing = atRemoteRow({ current_bin: '2.6 FR OTHER', ct_bin_at_sync: '2.6 FR OTHER' })
    const ctRemote = makeCtBottle({ location: 'REMOTE', bin: '2.6 FR OTHER', begin_consume: 2030, end_consume: 2045 })
    const { stats } = buildSyncRows([ctRemote], new Map([['0001', existing]]), 2026)
    expect(stats.needsMove).toBe(1)
    expect(stats.alreadyAtDestination).toBe(0)
  })

  it('never marks a packed bottle done just because its recommendation equals CT\'s (source) shelf', () => {
    const existing = atRemoteRow({ state: 'packed', trip_id: 'trip1', packed_at: '2026-10-27T10:00:00Z', current_bin: '3.8 FR OTHER', ct_bin_at_sync: '3.8 FR OTHER', recommended_location: 'HOME', recommended_bin: 'Lgh 4. FRANKRIKE' })
    const ctRemote = makeCtBottle({ location: 'REMOTE', bin: '3.8 FR OTHER', begin_consume: 2030, end_consume: 2045 })
    const { rows } = buildSyncRows([ctRemote], new Map([['0001', existing]]), 2026)
    expect(rows[0].recommended_bin).toBe('3.8 FR OTHER')
    expect(rows[0].state).toBe('packed')
    expect(rows[0].trip_id).toBe('trip1')
  })

  it('stats count every bottle exactly once: in place, moves to REMOTE, moves at home', () => {
    const kitchen = makeCtBottle({ barcode: 'k', location: 'Cellar', bin: null, bottle_cost: 200, begin_consume: 2020, end_consume: 2027 })
    const kitchenDone = makeCtBottle({ barcode: 'kd', location: 'Cellar', bin: 'Köket', bottle_cost: 200, begin_consume: 2020, end_consume: 2027 })
    const sweet = makeCtBottle({ barcode: 's', location: 'Cellar', bin: null, extra: { Vintage: '2015', Wine: 'Sauternes', Producer: 'X', Country: 'France', Region: 'Bordeaux', Type: 'White - Sweet/Dessert' } })
    const toRemote = makeCtBottle({ barcode: 'r', location: 'Cellar', bin: null, begin_consume: 2030, end_consume: 2045 })
    const atRemote = makeCtBottle({ barcode: 'a', location: 'REMOTE', bin: '3.8 FR OTHER', begin_consume: 2030, end_consume: 2045 })
    const { stats } = buildSyncRows([kitchen, kitchenDone, sweet, toRemote, atRemote], new Map(), 2026)
    expect(stats.alreadyAtDestination).toBe(2)
    expect(stats.needsMove).toBe(1)
    expect(stats.home).toBe(2)
  })

  it('a bottle shelved without a bin is not marked done just because CT has no bin either', () => {
    const existing = atRemoteRow({ state: 'shelved', current_location: 'Cellar', current_bin: null, ct_location_at_sync: 'Cellar', ct_bin_at_sync: null })
    const ctHome = makeCtBottle({ location: 'Cellar', bin: null, begin_consume: 2035, end_consume: 2070 })
    const { rows } = buildSyncRows([ctHome], new Map([['0001', existing]]), 2026)
    expect(rows[0].state).toBe('shelved')
  })
})

