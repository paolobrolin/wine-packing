import { describe, it, expect } from 'vitest'
import { groupByShelf, groupBySource, groupByOwc } from '../../src/hooks/useBottles'
import type { DbBottle } from '../../src/data/models'

function makeDbBottle(overrides: Partial<DbBottle> = {}): DbBottle {
  return {
    barcode: '0001', iwine: 1, vintage: '2020', wine: 'Test', producer: 'Test',
    country: 'France', region: 'Bordeaux', size: '750ml', cost: 500, cost_currency: 'SEK',
    begin_consume: 2025, end_consume: 2035,
    current_location: 'Cellar', current_bin: 'Källaren',
    recommended_location: 'REMOTE', recommended_bin: '2.1 BDX LB',
    move_reason: null, rule_id: null,
    state: 'pending', packed_at: null, in_transit_at: null, shelved_at: null, synced_at: null,
    trip_id: null, owc_group: null,
    ct_location_at_sync: null, ct_bin_at_sync: null,
    created_at: '', updated_at: '',
    ...overrides,
  }
}

describe('groupByShelf', () => {
  it('groups bottles by recommended_bin', () => {
    const bottles = [
      makeDbBottle({ barcode: '001', recommended_bin: '2.1 BDX LB' }),
      makeDbBottle({ barcode: '002', recommended_bin: '2.1 BDX LB' }),
      makeDbBottle({ barcode: '003', recommended_bin: '2.3 RHONE N' }),
    ]
    const groups = groupByShelf(bottles)
    expect(groups.size).toBe(2)
    expect(groups.get('2.1 BDX LB')!.length).toBe(2)
    expect(groups.get('2.3 RHONE N')!.length).toBe(1)
  })

  it('uses current_bin when recommended_bin is null', () => {
    const bottles = [makeDbBottle({ recommended_bin: null, current_bin: 'Källaren' })]
    const groups = groupByShelf(bottles)
    expect(groups.has('Källaren')).toBe(true)
  })

  it('uses "Unassigned" when both are null', () => {
    const bottles = [makeDbBottle({ recommended_bin: null, current_bin: null })]
    const groups = groupByShelf(bottles)
    expect(groups.has('Unassigned')).toBe(true)
  })
})

describe('groupBySource', () => {
  it('groups by current_bin', () => {
    const bottles = [
      makeDbBottle({ barcode: '001', current_bin: 'Källaren' }),
      makeDbBottle({ barcode: '002', current_bin: 'Källaren' }),
      makeDbBottle({ barcode: '003', current_bin: 'Cooler' }),
    ]
    const groups = groupBySource(bottles)
    expect(groups.size).toBe(2)
    expect(groups.get('Källaren')!.length).toBe(2)
  })
})

describe('groupByOwc', () => {
  it('separates OWC bottles from loose bottles', () => {
    const bottles = [
      makeDbBottle({ barcode: '001', owc_group: 'PdB 2020' }),
      makeDbBottle({ barcode: '002', owc_group: 'PdB 2020' }),
      makeDbBottle({ barcode: '003', owc_group: null }),
    ]
    const { owc, loose } = groupByOwc(bottles)
    expect(owc.size).toBe(1)
    expect(owc.get('PdB 2020')!.length).toBe(2)
    expect(loose.length).toBe(1)
  })

  it('handles all loose', () => {
    const bottles = [makeDbBottle({ owc_group: null })]
    const { owc, loose } = groupByOwc(bottles)
    expect(owc.size).toBe(0)
    expect(loose.length).toBe(1)
  })
})
