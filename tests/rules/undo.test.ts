import { describe, it, expect } from 'vitest'
import { undoFields, stepBackFields, resetFields, keepHereFields } from '../../src/rules/undo'
import type { DbBottle } from '../../src/data/models'

function b(overrides: Partial<DbBottle> = {}): DbBottle {
  return {
    barcode: '0001', iwine: 1, vintage: '2020', wine: 'W', producer: 'P', country: 'France', region: 'Bordeaux',
    size: '750ml', cost: 500, cost_currency: 'SEK', wine_type: null, begin_consume: 2025, end_consume: 2035,
    current_location: 'Cellar', current_bin: '3.3 BAROLO CLASSIC', recommended_location: 'REMOTE', recommended_bin: '3.3 BAROLO CLASSIC',
    move_reason: null, rule_id: null, state: 'shelved', packed_at: '2026-10-28T08:00:00Z', in_transit_at: null,
    shelved_at: '2026-10-28T09:00:00Z', synced_at: null, trip_id: null, owc_group: null, estimated_value: null,
    value_source: null, label_ref: null, ct_location_at_sync: 'Cellar', ct_bin_at_sync: 'Källaren',
    created_at: '', updated_at: '', ...overrides,
  }
}

describe('undoFields (toast undo restores the exact snapshot)', () => {
  it('restores state, bin and timestamps from before the action', () => {
    const before = b({ state: 'packed', shelved_at: null })
    expect(undoFields(before)).toEqual({
      state: 'packed', current_bin: '3.3 BAROLO CLASSIC', current_location: 'Cellar',
      recommended_bin: '3.3 BAROLO CLASSIC', packed_at: '2026-10-28T08:00:00Z', in_transit_at: null, shelved_at: null, synced_at: null,
    })
  })
})

describe('stepBackFields (card Undo goes one state back)', () => {
  it('shelved → packed keeps the destination bin and clears shelved_at', () => {
    expect(stepBackFields(b())).toMatchObject({ state: 'packed', shelved_at: null })
  })

  it('packed → pending restores the bin CT has (the source), not the destination', () => {
    expect(stepBackFields(b({ state: 'packed', shelved_at: null }))).toMatchObject({
      state: 'pending', current_bin: 'Källaren', current_location: 'Cellar', packed_at: null,
    })
  })
})

describe('resetFields (Reset to pending from any state)', () => {
  it('returns to pending at the CT position with all move timestamps cleared', () => {
    expect(resetFields(b())).toEqual({
      state: 'pending', current_bin: 'Källaren', current_location: 'Cellar',
      packed_at: null, in_transit_at: null, shelved_at: null,
    })
  })
})

describe('keepHereFields (Keep here: the bottle stays where it physically is)', () => {
  it('a packed bottle goes back to its CT position, not the destination it was packed for', () => {
    expect(keepHereFields(b({ state: 'packed', shelved_at: null }))).toEqual({
      state: 'synced', current_bin: 'Källaren', current_location: 'Cellar', packed_at: null, in_transit_at: null,
    })
  })

  it('a pending bottle keeps its current position', () => {
    expect(keepHereFields(b({ state: 'pending', current_bin: 'Lgh 2. FRANKRIKE' }))).toEqual({
      state: 'synced', current_bin: 'Lgh 2. FRANKRIKE', current_location: 'Cellar',
    })
  })
})
