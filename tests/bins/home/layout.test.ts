import { describe, it, expect } from 'vitest'
import { homeCategory, placesFor, CABINET, CELLAR_SHELVES, HOME_MARGIN } from '../../../src/bins/home/layout'
import { buildSyncRows, type CtBottle } from '../../../src/data/sync'
import type { Bottle } from '../../../src/rules/types'

function b(o: Partial<Bottle> = {}): Bottle {
  return {
    barcode: '0001', iwine: 1, vintage: '2020', wine: 'Test', producer: 'Test', country: 'France', region: 'Bordeaux',
    size: '750ml', cost: 300, beginConsume: 2024, endConsume: 2028, currentLocation: 'Cellar', currentBin: null,
    owcGroup: null, wineType: 'Red', ...o,
  }
}

describe('home layout — categories', () => {
  it.each([
    [{ country: 'Italy', region: 'Piedmont' }, 'ITALIA'],
    [{ country: 'France', region: 'Rhône' }, 'FRANKRIKE'],
    [{ country: 'Spain' }, 'SPANIEN_USA'],
    [{ country: 'USA', producer: 'Ridge' }, 'SPANIEN_USA'],
    [{ country: 'Lebanon' }, 'SPANIEN_USA'],
    [{ wineType: 'White', country: 'Germany' }, 'VITA'],
    [{ wineType: 'White - Sparkling', region: 'Champagne' }, 'BUBBEL'],
    [{ wineType: 'White - Sweet/Dessert', size: '375ml' }, 'SOTA'],
    [{ wineType: 'Red - Fortified', country: 'Portugal' }, 'SOTA'],
  ] as [Partial<Bottle>, string][])('%o → %s', (o, expected) => {
    expect(homeCategory(b(o))).toBe(expected)
  })

  it('every Sine Qua Non, red or white, goes to the SQN shelf', () => {
    expect(homeCategory(b({ country: 'USA', producer: 'Sine Qua Non', wine: 'Sine Qua Non Syrah Stock' }))).toBe('SQN')
    expect(homeCategory(b({ country: 'USA', producer: 'Sine Qua Non', wine: 'Sine Qua Non Distenta White III', wineType: 'White' }))).toBe('SQN')
  })
})

describe('home layout — places', () => {
  it('a magnum takes 2 places, a half bottle or 500 ml 2/3 (≈50 % more fit)', () => {
    expect(placesFor('750ml')).toBe(1)
    expect(placesFor('1.5L')).toBe(2)
    expect(placesFor('375ml')).toBeCloseTo(2 / 3)
    expect(placesFor('500ml')).toBeCloseTo(2 / 3)
  })

  it('cabinet: 15 movable rows of 12 over six shelves plus the fixed 18 at the bottom; top shelf is not 36', () => {
    const shelves = Object.values(CABINET)
    expect(shelves).toHaveLength(7)
    const byBin = [...shelves].sort((x, y) => x.bin.localeCompare(y.bin))
    expect(byBin[byBin.length - 1].capacity).toBe(18)
    expect(byBin[0].capacity).not.toBe(36)
    expect(byBin.slice(0, 6).reduce((a, s) => a + s.capacity, 0)).toBe(15 * 12)
    for (const s of byBin.slice(0, 6)) expect(s.capacity).toBeLessThanOrEqual(48)
  })

  it('Källaren: five shelves of 36 and 20 at the bottom', () => {
    expect(CELLAR_SHELVES.map((s) => s.capacity)).toEqual([36, 36, 36, 36, 36, 20])
    expect(HOME_MARGIN).toBe(2)
  })
})

function ct(barcode: string, o: Partial<CtBottle['extra']> & { size?: string; end?: number; bin?: string | null } = {}): CtBottle {
  return {
    barcode, iwine: Number(barcode), size: o.size ?? '750ml', location: 'Cellar', bin: o.bin ?? null,
    bottle_cost: 600, bottle_cost_currency: 'SEK', begin_consume: 2018, end_consume: o.end ?? 2027,
    bottle_note: null, purchase_note: null,
    extra: { Vintage: '2020', Wine: o.Wine ?? 'Test Barbera', Producer: o.Producer ?? 'Test', Country: o.Country ?? 'Italy', Region: o.Region ?? 'Piedmont', Type: o.Type ?? 'Red' },
  }
}

describe('home layout — filling the cabinet and Källaren', () => {
  const cab = CABINET.ITALIA
  const limit = cab.capacity - HOME_MARGIN

  it('fills the cabinet shelf to capacity minus margin, earliest drink window first, then Källaren', () => {
    const bottles = Array.from({ length: limit + 3 }, (_, i) => ct(String(1000 + i), { end: 2026 + (i % 3) }))
    const { rows } = buildSyncRows(bottles, new Map(), 2026)
    const inCab = rows.filter((r) => r.recommended_bin === cab.bin)
    expect(inCab).toHaveLength(limit)
    const ends = (xs: typeof rows) => xs.map((r) => r.end_consume as number)
    expect(Math.max(...ends(inCab))).toBeLessThanOrEqual(Math.min(...ends(rows.filter((r) => r.recommended_bin !== cab.bin))))
    expect(rows.filter((r) => (r.recommended_bin ?? '').startsWith('Kall'))).toHaveLength(3)
  })

  it('a bottle already on its cabinet shelf keeps its place, even with a late drink window', () => {
    const late = ct('2000', { end: 2030, bin: cab.bin })
    const early = Array.from({ length: limit }, (_, i) => ct(String(3000 + i), { end: 2026 }))
    const { rows } = buildSyncRows([late, ...early], new Map(), 2026)
    expect(rows.find((r) => r.barcode === '2000')!.recommended_bin).toBe(cab.bin)
  })

  it('magnums count as two places', () => {
    const mags = Array.from({ length: limit }, (_, i) => ct(String(4000 + i), { size: '1.5L', end: 2026 }))
    const { rows } = buildSyncRows(mags, new Map(), 2026)
    expect(rows.filter((r) => r.recommended_bin === cab.bin)).toHaveLength(Math.floor(limit / 2))
  })

  it('when the cabinet and Källaren are full, the latest drink windows go to external storage', () => {
    const cellarFor = CELLAR_SHELVES.filter((s) => s.categories.includes('ITALIA'))
    const room = limit + cellarFor.reduce((a, s) => a + s.capacity - HOME_MARGIN, 0)
    const bottles = Array.from({ length: room + 2 }, (_, i) => ct(String(5000 + i), { end: i < room ? 2026 + (i % 2) : 2028 }))
    const { rows } = buildSyncRows(bottles, new Map(), 2026)
    const remote = rows.filter((r) => r.recommended_location === 'REMOTE')
    expect(remote).toHaveLength(2)
    const latestHome = Math.max(...rows.filter((r) => r.recommended_location === 'HOME').map((r) => r.end_consume as number))
    for (const r of remote) expect(r.end_consume as number).toBeGreaterThanOrEqual(latestHome)
  })

  it('a bottle on an old cabinet shelf name counts as placed on its category\'s new shelf', () => {
    const ygay = ct('6000', { Country: 'Spain', Region: 'La Rioja', Wine: 'Marqués de Murrieta Rioja Ygay Reserva', end: 2030, bin: 'Lgh 3. SPANIEN + OVRIGT' })
    const fill = Array.from({ length: CABINET.SPANIEN_USA.capacity }, (_, i) => ct(String(6100 + i), { Country: 'Spain', Region: 'La Rioja', end: 2026 }))
    const { rows } = buildSyncRows([ygay, ...fill], new Map(), 2026)
    expect(rows.find((r) => r.barcode === '6000')!.recommended_bin).toBe(CABINET.SPANIEN_USA.bin)
  })

  it('counts bottles that overflow to external storage in the sync stats', () => {
    const cellarFor = CELLAR_SHELVES.filter((s) => s.categories.includes('ITALIA'))
    const room = limit + cellarFor.reduce((a, s) => a + s.capacity - HOME_MARGIN, 0)
    const bottles = Array.from({ length: room + 2 }, (_, i) => ct(String(7000 + i), { end: i < room ? 2026 : 2028 }))
    const { stats } = buildSyncRows(bottles, new Map(), 2026)
    expect(stats.alreadyAtDestination + stats.needsMove + stats.home).toBe(bottles.length)
  })
})

