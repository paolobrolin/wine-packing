import { describe, it, expect } from 'vitest'
import { SearchIndex } from '../../src/search/SearchIndex'
import type { DbBottle } from '../../src/data/models'

function mb(overrides: Partial<DbBottle> = {}): DbBottle {
  return {
    barcode: '0001', iwine: 1, vintage: '2020', wine: 'Test Wine',
    producer: 'Test Producer', country: 'France', region: 'Bordeaux',
    size: '750ml', cost: 500, cost_currency: 'SEK',
    begin_consume: 2025, end_consume: 2035,
    current_location: 'Cellar', current_bin: 'Källaren',
    recommended_location: 'REMOTE', recommended_bin: '2.1 BDX LB',
    move_reason: 'midpoint', rule_id: 'midpoint',
    state: 'pending', packed_at: null, in_transit_at: null,
    shelved_at: null, synced_at: null,
    trip_id: null, owc_group: null,
    ct_location_at_sync: null, ct_bin_at_sync: null,
    created_at: '', updated_at: '',
    ...overrides,
  }
}

const bottles: DbBottle[] = [
  mb({ barcode: '001', iwine: 1, producer: 'Giacomo Conterno', wine: 'Giacomo Conterno Barolo Monfortino', vintage: '2019', region: 'Piedmont', country: 'Italy', recommended_bin: '3.3 BAROLO CLASSIC', state: 'pending' }),
  mb({ barcode: '002', iwine: 2, producer: 'Oddero', wine: 'Oddero Barolo Brunate', vintage: '2021', region: 'Piedmont', country: 'Italy', recommended_bin: '3.3 BAROLO CLASSIC', state: 'pending' }),
  mb({ barcode: '003', iwine: 3, producer: 'Oddero', wine: 'Oddero Barolo Rocche di Castiglione', vintage: '2021', region: 'Piedmont', country: 'Italy', recommended_bin: '3.3 BAROLO CLASSIC', state: 'packed' }),
  mb({ barcode: '004', iwine: 4, producer: 'Kongsgaard', wine: 'Kongsgaard Chardonnay', vintage: '2022', region: 'California', country: 'USA', recommended_location: null, recommended_bin: null, state: 'pending' }),
  mb({ barcode: '005', iwine: 5, producer: 'Vieux Chateau des Conti', wine: 'Vieux Chateau des Conti Pomerol', vintage: '2018', region: 'Bordeaux', country: 'France', recommended_bin: '2.2 BDX RB', state: 'shelved' }),
  mb({ barcode: '006', iwine: 2, producer: 'Oddero', wine: 'Oddero Barolo Brunate', vintage: '2021', region: 'Piedmont', country: 'Italy', recommended_bin: '3.3 BAROLO CLASSIC', state: 'pending' }),
]

describe('SearchIndex', () => {
  const index = new SearchIndex(bottles)

  describe('basic matching', () => {
    it('returns empty for empty query', () => {
      expect(index.search('', 'packing')).toEqual({ needsAction: [], inProgress: [], noMove: [], total: 0 })
    })

    it('returns empty for whitespace-only query', () => {
      expect(index.search('   ', 'packing').total).toBe(0)
    })

    it('matches producer prefix with high score', () => {
      const r = index.search('cont', 'packing')
      expect(r.total).toBeGreaterThan(0)
      const names = [...r.needsAction, ...r.inProgress, ...r.noMove].map(s => s.bottle.producer)
      expect(names[0]).toBe('Giacomo Conterno')
    })

    it('matches vintage', () => {
      const r = index.search('2021', 'packing')
      expect(r.total).toBeGreaterThanOrEqual(2)
    })

    it('multi-word AND: all terms must match', () => {
      const r = index.search('barolo 2021', 'packing')
      const all = [...r.needsAction, ...r.inProgress, ...r.noMove]
      all.forEach(s => {
        expect(s.bottle.wine.toLowerCase()).toContain('barolo')
        expect(s.bottle.vintage).toBe('2021')
      })
    })

    it('is case-insensitive', () => {
      const r1 = index.search('ODDERO', 'packing')
      const r2 = index.search('oddero', 'packing')
      expect(r1.total).toBe(r2.total)
    })
  })

  describe('ranking', () => {
    it('ranks producer prefix match above mid-word match', () => {
      const r = index.search('cont', 'packing')
      const all = [...r.needsAction, ...r.inProgress, ...r.noMove]
      expect(all.length).toBeGreaterThanOrEqual(2)
      expect(all[0].bottle.producer).toBe('Giacomo Conterno')
    })

    it('ranks pending+needs-move above packed', () => {
      const r = index.search('oddero', 'packing')
      expect(r.needsAction.length).toBeGreaterThan(0)
      expect(r.inProgress.length).toBeGreaterThan(0)
    })

    it('bottles that stay home go to noMove tier', () => {
      const r = index.search('kongsgaard', 'packing')
      expect(r.noMove.length).toBeGreaterThan(0)
      expect(r.noMove[0].bottle.producer).toBe('Kongsgaard')
    })
  })

  describe('tiering', () => {
    it('pending + needs-move = needs-action', () => {
      const r = index.search('conterno', 'packing')
      expect(r.needsAction.length).toBe(1)
      expect(r.needsAction[0].tier).toBe('needs-action')
    })

    it('packed = in-progress', () => {
      const r = index.search('rocche', 'packing')
      expect(r.inProgress.length).toBe(1)
      expect(r.inProgress[0].tier).toBe('in-progress')
    })

    it('shelved = no-move', () => {
      const r = index.search('conti pomerol', 'packing')
      expect(r.noMove.length).toBe(1)
    })

    it('no recommended_location = no-move (stays home)', () => {
      const r = index.search('kongsgaard', 'packing')
      expect(r.noMove.length).toBe(1)
      expect(r.noMove[0].tier).toBe('no-move')
    })
  })

  describe('performance', () => {
    it('builds index for 1000 bottles in <20ms', () => {
      const big = Array.from({ length: 1000 }, (_, i) => mb({
        barcode: String(i), iwine: i, producer: `Producer ${i}`, wine: `Wine ${i}`,
        vintage: String(2015 + (i % 10)),
      }))
      const start = performance.now()
      new SearchIndex(big)
      expect(performance.now() - start).toBeLessThan(20)
    })

    it('searches 1000 bottles in <10ms', () => {
      const big = Array.from({ length: 1000 }, (_, i) => mb({
        barcode: String(i), iwine: i, producer: `Producer ${i}`, wine: `Wine ${i} Barolo`,
        vintage: String(2015 + (i % 10)),
      }))
      const idx = new SearchIndex(big)
      const start = performance.now()
      idx.search('barolo 2020', 'packing')
      expect(performance.now() - start).toBeLessThan(50)
    })
  })
})
