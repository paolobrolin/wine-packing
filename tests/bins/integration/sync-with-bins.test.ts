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

  describe('the prestige row holds the 11 dearest Barolo bottles per 750 ml', () => {
    const barolo = (barcode: string, cost: number, size = '750ml') => makeCtBottle({
      barcode, size, bottle_cost: cost, begin_consume: 2030, end_consume: 2050,
      extra: { Vintage: '2020', Wine: `${barcode} Barolo`, Producer: `P${barcode}`, Country: 'Italy', Region: 'Piedmont', Appellation: 'Barolo', Type: 'Red' },
    })
    const binOf = (rows: { barcode: string; recommended_bin: string | null }[], bc: string) => rows.find((r) => r.barcode === bc)!.recommended_bin

    it('the cheapest of 12 stays off the row', () => {
      const bs = Array.from({ length: 12 }, (_, n) => barolo(`b${n}`, 1000 + n * 100))
      const { rows } = buildSyncRows(bs, new Map(), 2026)
      expect(rows.filter((r) => r.recommended_bin === '2.5 BAROLO PRESTIGE')).toHaveLength(11)
      expect(binOf(rows, 'b0')).not.toBe('2.5 BAROLO PRESTIGE')
    })

    it('a magnum is ranked by its price per 750 ml', () => {
      const bs = [...Array.from({ length: 11 }, (_, n) => barolo(`b${n}`, 1500)), barolo('mag', 2800, '1.5L')]
      const { rows } = buildSyncRows(bs, new Map(), 2026)
      expect(binOf(rows, 'mag')).not.toBe('2.5 BAROLO PRESTIGE')
    })
  })

  it('an OWC case kept at home stays together on one shelf', () => {
    const spanish = (barcode: string, o: Partial<CtBottle> = {}) => makeCtBottle({
      barcode, location: 'Cellar', begin_consume: 2020, end_consume: 2026,
      extra: { Vintage: '2015', Wine: `${barcode} Rioja`, Producer: `P${barcode}`, Country: 'Spain', Region: 'La Rioja', Appellation: 'Rioja', Type: 'Red' },
      ...o,
    })
    // 19 earlier bottles leave room for 3 of the case in Lgh 6 (24 places, margin 2).
    const fillers = Array.from({ length: 19 }, (_, n) => spanish(`f${n}`))
    const ygay = Array.from({ length: 6 }, (_, n) => spanish(`y${n}`, {
      begin_consume: 2022, end_consume: 2027, bottle_note: 'OWC 6 fl (lot 1746531). 1987-samlingen.', purchase_note: 'Bukowskis lot 1746531',
      extra: { Vintage: '1987', Wine: 'Marqués de Murrieta Rioja Castillo Ygay Gran Reserva Especial', Producer: 'Marqués de Murrieta', Country: 'Spain', Region: 'La Rioja', Appellation: 'Rioja', Type: 'Red' },
    }))
    const { rows } = buildSyncRows([...fillers, ...ygay], new Map(), 2026)
    const bins = new Set(rows.filter((r) => r.barcode.startsWith('y')).map((r) => r.recommended_bin))
    expect(bins.size).toBe(1)
  })
})
