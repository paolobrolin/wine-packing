/**
 * Realistic ranking tests using actual CT wine data patterns.
 * These tests prevent the class of bugs where synthetic test data
 * doesn't capture real-world field collisions.
 */
import { describe, it, expect } from 'vitest'
import { SearchIndex } from '../../src/search/SearchIndex'
import type { DbBottle } from '../../src/data/models'

function mb(overrides: Partial<DbBottle>): DbBottle {
  return {
    barcode: '0001', iwine: 1, vintage: '2020', wine: 'Test',
    producer: 'Test', country: 'France', region: 'Bordeaux', size: '750ml',
    cost: 500, cost_currency: 'SEK', begin_consume: 2025, end_consume: 2045,
    current_location: 'Cellar', current_bin: 'Källaren',
    recommended_location: 'REMOTE', recommended_bin: '2.1 BDX LB',
    move_reason: 'midpoint', rule_id: 'midpoint',
    state: 'pending', packed_at: null, in_transit_at: null,
    shelved_at: null, synced_at: null, trip_id: null, owc_group: null,
    ct_location_at_sync: null, ct_bin_at_sync: null,
    created_at: '', updated_at: '',
    ...overrides,
  }
}

// Realistic wine data from Paolo's actual cellar
const REALISTIC_BOTTLES: DbBottle[] = [
  // Barolo wines → should rank HIGH for "bar"
  mb({ barcode: 'B01', iwine: 101, producer: 'Oddero', wine: 'Oddero Barolo Brunate', vintage: '2021', region: 'Piedmont', country: 'Italy', recommended_bin: '3.3 BAROLO CLASSIC' }),
  mb({ barcode: 'B02', iwine: 102, producer: 'Massolino', wine: 'Massolino Barolo Parafada', vintage: '2021', region: 'Piedmont', country: 'Italy', recommended_bin: '3.3 BAROLO CLASSIC' }),
  mb({ barcode: 'B03', iwine: 103, producer: 'E. Pira & Figli (Chiara Boschis)', wine: 'E. Pira & Figli (Chiara Boschis) Barolo Cannubi', vintage: '2021', region: 'Piedmont', country: 'Italy', recommended_bin: '3.2 BAROLO MODERN' }),

  // Santa Barbara wines → should rank LOWER for "bar" (match on region word, not wine type)
  mb({ barcode: 'SB1', iwine: 201, producer: 'Au Bon Climat', wine: 'Au Bon Climat Chardonnay Santa Barbara County', vintage: '2023', region: 'California', country: 'USA', recommended_bin: '1.8 NEW WORLD OTHER' }),
  mb({ barcode: 'SB2', iwine: 202, producer: 'Saxum', wine: 'Saxum James Berry Vineyard', vintage: '2022', region: 'California', country: 'USA', recommended_bin: '1.7 SPOTS + HIRSCH + RIDGE' }),

  // Barbaresco → should rank HIGH for "bar" (starts with "bar")
  mb({ barcode: 'BA1', iwine: 301, producer: 'Produttori del Barbaresco', wine: 'Produttori del Barbaresco Barbaresco Riserva Ovello', vintage: '2020', region: 'Piedmont', country: 'Italy', recommended_bin: '3.4 BARBARESCO' }),

  // Bordeaux wines → should NOT match "bar"
  mb({ barcode: 'BX1', iwine: 401, producer: 'Château Latour', wine: 'Château Latour Les Forts de Latour', vintage: '2016', region: 'Bordeaux', country: 'France', recommended_bin: '2.1 BDX LB' }),

  // Conterno → test producer prefix
  mb({ barcode: 'GC1', iwine: 501, producer: 'Giacomo Conterno', wine: 'Giacomo Conterno Barolo Monfortino', vintage: '2019', region: 'Piedmont', country: 'Italy', recommended_bin: '3.3 BAROLO CLASSIC' }),

  // "des Conti" → should rank below Conterno for "cont"
  mb({ barcode: 'VC1', iwine: 601, producer: 'Vieux Château des Conti', wine: 'Vieux Château des Conti Pomerol', vintage: '2018', region: 'Bordeaux', country: 'France', recommended_bin: '2.2 BDX RB' }),

  // Stays home (no recommended_location)
  mb({ barcode: 'H01', iwine: 701, producer: 'Kongsgaard', wine: 'Kongsgaard Chardonnay', vintage: '2019', region: 'California', country: 'USA', recommended_location: null, recommended_bin: null, state: 'pending' }),

  // Champagne
  mb({ barcode: 'CH1', iwine: 801, producer: 'Louis Roederer', wine: 'Louis Roederer Champagne Cristal Brut Rosé', vintage: '2008', region: 'Champagne', country: 'France', recommended_bin: '2.5 CHAMPAGNE' }),
]

describe('realistic ranking', () => {
  const index = new SearchIndex(REALISTIC_BOTTLES)

  describe('"bar" query — Barolo vs Santa Barbara', () => {
    it('ranks Barolo wines above Santa Barbara wines', () => {
      const r = index.search('bar', 'packing')
      const all = [...r.needsAction, ...r.inProgress, ...r.noMove]
      const barolo = all.filter(s => s.bottle.wine.includes('Barolo') || s.bottle.wine.includes('Barbaresco'))
      const barbara = all.filter(s => s.bottle.wine.includes('Barbara'))

      expect(barolo.length).toBeGreaterThan(0)
      // All Barolo/Barbaresco wines should appear before any Santa Barbara wine
      const firstBaroloIdx = all.findIndex(s => s.bottle.wine.includes('Barolo') || s.bottle.wine.includes('Barbaresco'))
      const firstBarbaraIdx = all.findIndex(s => s.bottle.wine.includes('Santa Barbara'))
      if (firstBarbaraIdx >= 0) {
        expect(firstBaroloIdx).toBeLessThan(firstBarbaraIdx)
      }
    })

    it('does not match Bordeaux wines (no "bar" in Bordeaux fields)', () => {
      const r = index.search('bar', 'packing')
      const all = [...r.needsAction, ...r.inProgress, ...r.noMove]
      const bordeaux = all.filter(s => s.bottle.producer === 'Château Latour')
      expect(bordeaux.length).toBe(0)
    })

    it('matches Barbaresco via wine name and bin', () => {
      const r = index.search('bar', 'packing')
      const all = [...r.needsAction, ...r.inProgress, ...r.noMove]
      expect(all.some(s => s.bottle.wine.includes('Barbaresco'))).toBe(true)
    })
  })

  describe('"barolo" query — specific wine type', () => {
    it('returns only Barolo wines (not Barbaresco, not Barbara)', () => {
      const r = index.search('barolo', 'packing')
      const all = [...r.needsAction, ...r.inProgress, ...r.noMove]
      all.forEach(s => {
        const hasBarolo = s.bottle.wine.toLowerCase().includes('barolo') ||
          (s.bottle.recommended_bin ?? '').toLowerCase().includes('barolo')
        expect(hasBarolo).toBe(true)
      })
    })
  })

  describe('"cont" query — producer prefix ranking', () => {
    it('ranks Giacomo Conterno above Vieux Château des Conti', () => {
      const r = index.search('cont', 'packing')
      const all = [...r.needsAction, ...r.inProgress, ...r.noMove]
      const conternoIdx = all.findIndex(s => s.bottle.producer === 'Giacomo Conterno')
      const contiIdx = all.findIndex(s => s.bottle.producer.includes('Conti'))
      expect(conternoIdx).toBeLessThan(contiIdx)
    })
  })

  describe('"kongsgaard" — home wine appears in no-move tier', () => {
    it('shows Kongsgaard in noMove tier', () => {
      const r = index.search('kongsgaard', 'packing')
      expect(r.noMove.length).toBe(1)
      expect(r.noMove[0].bottle.producer).toBe('Kongsgaard')
    })
  })

  describe('multi-word queries', () => {
    it('"barolo 2021" returns only 2021 Barolo', () => {
      const r = index.search('barolo 2021', 'packing')
      const all = [...r.needsAction, ...r.inProgress, ...r.noMove]
      expect(all.length).toBeGreaterThan(0)
      all.forEach(s => {
        expect(s.bottle.vintage).toBe('2021')
      })
    })

    it('"cristal rose" finds Roederer Cristal', () => {
      const r = index.search('cristal rose', 'packing')
      const all = [...r.needsAction, ...r.inProgress, ...r.noMove]
      expect(all.length).toBe(1)
      expect(all[0].bottle.producer).toBe('Louis Roederer')
    })
  })

  describe('minimum query length', () => {
    it('returns nothing for single character', () => {
      expect(index.search('b', 'packing').total).toBe(0)
    })

    it('returns results for two characters', () => {
      expect(index.search('ba', 'packing').total).toBeGreaterThan(0)
    })
  })

  describe('result count sanity', () => {
    it('"ba" returns fewer results than total bottles', () => {
      const r = index.search('ba', 'packing')
      expect(r.total).toBeLessThan(REALISTIC_BOTTLES.length)
    })

    it('more specific query returns fewer results', () => {
      const broad = index.search('bar', 'packing')
      const specific = index.search('barolo', 'packing')
      expect(specific.total).toBeLessThanOrEqual(broad.total)
    })
  })
})
