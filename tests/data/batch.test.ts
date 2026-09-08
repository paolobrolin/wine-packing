import { describe, it, expect } from 'vitest'
import { planBatch, batchSummary } from '../../src/data/batch'
import type { DbBottle } from '../../src/data/models'

function mb(overrides: Partial<DbBottle> = {}): DbBottle {
  return {
    barcode: '0001', iwine: 1, vintage: '2020', wine: 'Test Wine',
    producer: 'Test', country: 'France', region: 'Bordeaux', size: '750ml',
    cost: 500, cost_currency: 'SEK', wine_type: null,
    begin_consume: 2025, end_consume: 2035,
    current_location: 'Cellar', current_bin: null,
    recommended_location: 'REMOTE', recommended_bin: '2.1 BDX LB',
    move_reason: 'midpoint', rule_id: 'midpoint',
    state: 'pending', packed_at: null, in_transit_at: null, shelved_at: null, synced_at: null,
    trip_id: null, owc_group: null, estimated_value: null, value_source: null,
    ct_location_at_sync: null, ct_bin_at_sync: null,
    created_at: '', updated_at: '',
    ...overrides,
  }
}

describe('planBatch', () => {
  it('plans a pack for every pending cross-location bottle', () => {
    const plan = planBatch([mb({ barcode: 'A' }), mb({ barcode: 'B' })])

    expect(plan.steps).toHaveLength(2)
    expect(plan.steps.map((s) => s.nextState)).toEqual(['packed', 'packed'])
    expect(plan.steps.map((s) => s.barcode)).toEqual(['A', 'B'])
    expect(plan.skipped).toEqual([])
  })

  it('captures previous state and bin on every step so undo can revert', () => {
    const plan = planBatch([mb({
      barcode: 'A', current_bin: 'Källaren', state: 'packed',
      packed_at: '2026-09-01T10:00:00Z',
    })])

    const [s] = plan.steps
    expect(s.nextState).toBe('shelved')
    expect(s.prevState).toBe('packed')
    expect(s.prevBin).toBe('Källaren')
    expect(s.prevPackedAt).toBe('2026-09-01T10:00:00Z')
  })

  it('rebins synced bottles in place instead of throwing', () => {
    const plan = planBatch([mb({
      barcode: 'A', state: 'synced', current_location: 'Cellar',
      current_bin: 'Lgh 1. ITALIA', recommended_location: 'HOME', recommended_bin: 'Lgh 6. VITA',
    })])

    expect(plan.steps).toHaveLength(1)
    expect(plan.steps[0].nextState).toBe('synced')
    expect(plan.steps[0].bin).toBe('Lgh 6. VITA')
    expect(plan.steps[0].prevBin).toBe('Lgh 1. ITALIA')
  })

  it('skips synced bottles that already sit in their recommended bin', () => {
    const plan = planBatch([mb({
      barcode: 'A', state: 'synced',
      current_bin: '2.1 BDX LB', recommended_bin: '2.1 BDX LB',
    })])

    expect(plan.steps).toEqual([])
    expect(plan.skipped).toEqual(['A'])
  })

  it('skips bottles with no valid forward move rather than failing the batch', () => {
    const plan = planBatch([
      mb({ barcode: 'GOOD' }),
      mb({ barcode: 'BAD', state: 'pending', recommended_location: null, recommended_bin: null }),
    ])

    expect(plan.steps.map((s) => s.barcode)).toEqual(['GOOD'])
    expect(plan.skipped).toEqual(['BAD'])
  })

  it('reports a shared destination when all steps target the same bin', () => {
    const plan = planBatch([mb({ barcode: 'A' }), mb({ barcode: 'B' })])
    expect(plan.destination).toBe('2.1 BDX LB')
  })

  it('reports no shared destination when bins differ', () => {
    const plan = planBatch([
      mb({ barcode: 'A', recommended_bin: '2.1 BDX LB' }),
      mb({ barcode: 'B', recommended_bin: '2.2 BDX RB' }),
    ])
    expect(plan.destination).toBeNull()
  })

  it('handles an empty batch', () => {
    const plan = planBatch([])
    expect(plan.steps).toEqual([])
    expect(plan.destination).toBeNull()
  })
})

describe('batchSummary', () => {
  it('names the destination when shared', () => {
    expect(batchSummary(planBatch([mb({ barcode: 'A' }), mb({ barcode: 'B' })])))
      .toBe('2 bottles → 2.1 BDX LB')
  })

  it('uses singular for one bottle', () => {
    expect(batchSummary(planBatch([mb()]))).toBe('1 bottle → 2.1 BDX LB')
  })

  it('omits the destination when bins differ', () => {
    const plan = planBatch([
      mb({ barcode: 'A', recommended_bin: '2.1 BDX LB' }),
      mb({ barcode: 'B', recommended_bin: '2.2 BDX RB' }),
    ])
    expect(batchSummary(plan)).toBe('2 bottles')
  })

  it('says nothing to move for an empty plan', () => {
    expect(batchSummary(planBatch([]))).toBe('Nothing to move')
  })
})
