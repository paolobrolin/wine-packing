import { describe, it, expect } from 'vitest'
import { buildSyncRows, type CtBottle } from '../../../src/data/sync'

function makeCtBottle(overrides: Partial<CtBottle> = {}): CtBottle {
  return {
    barcode: '0001', iwine: 1, size: '750ml',
    location: null, bin: null,
    bottle_cost: 500, bottle_cost_currency: 'SEK',
    begin_consume: 2025, end_consume: 2045,
    bottle_note: null, purchase_note: null,
    extra: {
      Vintage: '2020', Wine: 'Test Wine', Producer: 'Test Producer',
      Country: 'France', Region: 'Bordeaux', Type: null,
    },
    ...overrides,
  }
}

describe('buildSyncRows with bin resolution', () => {
  it('assigns REMOTE bin for Bordeaux LB wine', () => {
    const ct = makeCtBottle({
      extra: { Vintage: '2020', Wine: 'Château Ducru-Beaucaillou', Producer: 'Château Ducru-Beaucaillou', Country: 'France', Region: 'Bordeaux', SubRegion: 'Médoc' },
    })
    const { rows } = buildSyncRows([ct], new Map(), 2026)
    expect(rows[0].recommended_location).toBe('REMOTE')
    expect(rows[0].recommended_bin).toBe('2.8 BDX LB')
  })

  it('assigns REMOTE bin for SQN Syrah', () => {
    const ct = makeCtBottle({
      extra: { Vintage: '2018', Wine: 'Sine Qua Non Syrah Touché', Producer: 'Sine Qua Non', Country: 'USA', Region: 'California' },
    })
    const { rows } = buildSyncRows([ct], new Map(), 2026)
    expect(rows[0].recommended_location).toBe('REMOTE')
    expect(rows[0].recommended_bin).toBe('1.3 SQN REGULAR')
  })

  it('assigns REMOTE bin for Champagne', () => {
    const ct = makeCtBottle({
      extra: { Vintage: '2008', Wine: 'Louis Roederer Champagne Cristal', Producer: 'Louis Roederer', Country: 'France', Region: 'Champagne' },
      begin_consume: 2020, end_consume: 2045,
    })
    const { rows } = buildSyncRows([ct], new Map(), 2026)
    expect(rows[0].recommended_bin).toBe('3.8 SPARKLING L–Z')
  })

  it('assigns HOME placement with bin for HOME bottles', () => {
    const ct = makeCtBottle({ begin_consume: 2024, end_consume: 2028 })
    const { rows } = buildSyncRows([ct], new Map(), 2026)
    expect(rows[0].recommended_location).toBe('HOME')
    expect(rows[0].recommended_bin).not.toBeNull()
  })

  it('routes OWC-marked bottle to 1.1 OWC via bottle_note', () => {
    const ct = makeCtBottle({
      extra: { Vintage: '2023', Wine: 'Chardonnay White Bones Adrianna', Producer: 'Bodega Catena Zapata', Country: 'Argentina', Region: 'Mendoza' },
      bottle_note: 'OWC 3x1 bottle',
    })
    const { rows } = buildSyncRows([ct], new Map(), 2026)
    expect(rows[0].recommended_location).toBe('REMOTE')
    expect(rows[0].recommended_bin).toBe('1.1 OWC')
  })

  it('non-OWC bottle from same producer goes to the New World shelf', () => {
    const ct = makeCtBottle({
      extra: { Vintage: '2023', Wine: 'Catena Alta Malbec', Producer: 'Bodega Catena Zapata', Country: 'Argentina', Region: 'Mendoza' },
      bottle_note: null,
    })
    const { rows } = buildSyncRows([ct], new Map(), 2026)
    expect(rows[0].recommended_bin).toBe('5.8 NEW WORLD')
  })

  it('keeps sweet wine home via wineType (no REMOTE recommendation)', () => {
    const ct = makeCtBottle({
      extra: { Vintage: '2023', Wine: 'Château Coutet Barsac', Producer: 'Château Coutet', Country: 'France', Region: 'Bordeaux', Type: 'White - Sweet/Dessert' },
    })
    const { rows } = buildSyncRows([ct], new Map(), 2026)
    expect(rows[0].recommended_location).not.toBe('REMOTE')
  })

  it('routes sparkling to the sparkling shelves via wineType', () => {
    const ct = makeCtBottle({
      extra: { Vintage: '2020', Wine: 'Ferrari Perlé', Producer: 'Ferrari', Country: 'Italy', Region: 'Trentino-Alto Adige', Type: 'White - Sparkling' },
    })
    const { rows } = buildSyncRows([ct], new Map(), 2026)
    expect(rows[0].recommended_bin).toBe('3.7 SPARKLING A–K')
  })

  it('assigns the Mediterranean shelf (with Greece) for Lebanon', () => {
    const ct = makeCtBottle({
      extra: { Vintage: '2020', Wine: 'Chateau Musar', Producer: 'Chateau Musar', Country: 'Lebanon', Region: 'Bekaa' },
    })
    const { rows } = buildSyncRows([ct], new Map(), 2026)
    expect(rows[0].recommended_location).toBe('REMOTE')
    expect(rows[0].recommended_bin).toBe('4.3 SP DUERO + GREECE')
  })

  it('a Vin de France follows the producer\'s home region (Rousset-Martin\'s Pinot Noir with his Jura)', () => {
    const jura = makeCtBottle({ barcode: '0001', extra: { Vintage: '2022', Wine: 'François Rousset-Martin Savagnin', Producer: 'François Rousset-Martin', Country: 'France', Region: 'Jura', Type: 'White' } })
    const vdf = makeCtBottle({ barcode: '0002', extra: { Vintage: '2023', Wine: 'François Rousset-Martin Pinot Noir Voyage au bout de Nuits', Producer: 'François Rousset-Martin', Country: 'France', Region: 'France', Type: 'Red' } })
    const { rows } = buildSyncRows([jura, vdf], new Map(), 2026)
    expect(rows.find((r) => r.barcode === '0002')!.recommended_bin).toBe('4.8 JURA')
  })

  it('a Vin de France without other bottles from the producer stays in FR OTHER', () => {
    const vdf = makeCtBottle({ extra: { Vintage: '2024', Wine: 'Domaine X Vin de France', Producer: 'Domaine X', Country: 'France', Region: 'France', Type: 'Red' } })
    const { rows } = buildSyncRows([vdf], new Map(), 2026)
    expect(rows[0].recommended_bin).toBe('3.6 FR OTHER')
  })

  describe('Barolo prestige is decided per wine, on market value', () => {
    const pira = (barcode: string, vintage: string, o: Partial<CtBottle> & { valuation?: string } = {}) => makeCtBottle({
      barcode, bottle_cost: o.bottle_cost ?? 1250, size: o.size ?? '750ml',
      extra: { Vintage: vintage, Wine: o.extra?.Wine ?? 'Roagna Barolo Pira', Producer: o.extra?.Producer ?? 'Roagna', Country: 'Italy', Region: 'Piedmont', Appellation: 'Barolo', Type: 'Red', Valuation: o.valuation ?? null },
    })
    const binOf = (rows: { barcode: string; recommended_bin: string | null }[], bc: string) => rows.find((r) => r.barcode === bc)!.recommended_bin

    it('every vintage of a wine follows the one valued from 1 800 kr', () => {
      const { rows } = buildSyncRows([pira('a', '2019', { valuation: '1887,9516' }), pira('b', '2020', { valuation: '1500' })], new Map(), 2026)
      expect(binOf(rows, 'a')).toBe('2.5 BAROLO PRESTIGE')
      expect(binOf(rows, 'b')).toBe('2.5 BAROLO PRESTIGE')
    })

    it('without a market value the purchase price per 750 ml counts', () => {
      const plain = makeCtBottle({ barcode: 'c', bottle_cost: 1900, extra: { Vintage: '2020', Wine: 'X Barolo', Producer: 'X', Country: 'Italy', Region: 'Piedmont', Appellation: 'Barolo', Type: 'Red' } })
      const magnum = makeCtBottle({ barcode: 'd', size: '1.5L', bottle_cost: 3229, extra: { Vintage: '2021', Wine: 'Y Barolo', Producer: 'Y', Country: 'Italy', Region: 'Piedmont', Appellation: 'Barolo', Type: 'Red' } })
      const { rows } = buildSyncRows([plain, magnum], new Map(), 2026)
      expect(binOf(rows, 'c')).toBe('2.5 BAROLO PRESTIGE')
      expect(binOf(rows, 'd')).not.toBe('2.5 BAROLO PRESTIGE')
    })

    it('a market value below 1 800 keeps the wine off the row even if it was bought dearer', () => {
      const { rows } = buildSyncRows([pira('e', '2020', { bottle_cost: 2749, valuation: '1684' })], new Map(), 2026)
      expect(binOf(rows, 'e')).not.toBe('2.5 BAROLO PRESTIGE')
    })
  })
})
