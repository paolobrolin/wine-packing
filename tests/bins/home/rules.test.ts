import { describe, it, expect } from 'vitest'
import { homeBinRules } from '../../../src/bins/home'
import { resolveBin } from '../../../src/bins/resolve'
import { createCapacityTracker } from '../../../src/bins/capacity'
import { determineHomeSubLocation, buildHomeBinId } from '../../../src/bins/home-sub-location'
import type { BinResolverContext } from '../../../src/bins/types'
import type { Bottle } from '../../../src/rules/types'

function makeBottle(overrides: Partial<Bottle> = {}): Bottle {
  return {
    barcode: '0001', iwine: 1, vintage: '2020', wine: 'Test Wine',
    producer: 'Test', country: 'Italy', region: 'Piedmont', size: '750ml',
    cost: 500, beginConsume: 2025, endConsume: 2030,
    currentLocation: null, currentBin: null, owcGroup: null, wineType: null,
    ...overrides,
  }
}

function makeContext(): BinResolverContext {
  return {
    currentYear: 2026,
    capacity: createCapacityTracker(new Map()),
    allBottles: [],
    owcGroups: new Map(),
    owcAssignments: new Map(),
  }
}

function resolveHome(bottle: Bottle) {
  const category = resolveBin(bottle, 'HOME', homeBinRules, makeContext())
  if (!category) return null
  const sub = determineHomeSubLocation(bottle, 2026)
  return { fullBinId: buildHomeBinId(category.binId, sub), category: category.binId, sub }
}

describe('HOME bin rules — category assignment', () => {
  it('Italian wine → 1. ITALIA', () => {
    const r = resolveHome(makeBottle({ country: 'Italy', region: 'Piedmont', wine: 'Oddero Barolo' }))
    expect(r!.category).toBe('1. ITALIA')
  })

  it('French wine → 2. FRANKRIKE', () => {
    const r = resolveHome(makeBottle({ country: 'France', region: 'Rhône', wine: 'Vieux Télégraphe CdP' }))
    expect(r!.category).toBe('2. FRANKRIKE')
  })

  it('Spanish wine → 3. SPANIEN + OVRIGT', () => {
    const r = resolveHome(makeBottle({ country: 'Spain', region: 'La Rioja', wine: 'Roda I' }))
    expect(r!.category).toBe('3. SPANIEN + OVRIGT')
  })

  it('USA wine → 4. USA', () => {
    const r = resolveHome(makeBottle({ country: 'USA', region: 'California', wine: 'Turley Juvenile' }))
    expect(r!.category).toBe('4. USA')
  })

  it('German white (Riesling) → 6. VITA (style beats region)', () => {
    const r = resolveHome(makeBottle({ country: 'Germany', region: 'Mosel', wine: 'Loosen Riesling', wineType: 'White' }))
    expect(r!.category).toBe('6. VITA')
  })

  it('German red → 3. SPANIEN + OVRIGT', () => {
    const r = resolveHome(makeBottle({ country: 'Germany', region: 'Baden', wine: 'Ziereisen Spätburgunder', wineType: 'Red' }))
    expect(r!.category).toBe('3. SPANIEN + OVRIGT')
  })

  it('Greek white (Assyrtiko) → 6. VITA', () => {
    const r = resolveHome(makeBottle({ country: 'Greece', region: 'Thessaly', wine: 'Dougos Assyrtiko', wineType: 'White' }))
    expect(r!.category).toBe('6. VITA')
  })

  it('Greek red → 3. SPANIEN + OVRIGT', () => {
    const r = resolveHome(makeBottle({ country: 'Greece', region: 'Macedonia', wine: 'Dougos Xinomavro', wineType: 'Red' }))
    expect(r!.category).toBe('3. SPANIEN + OVRIGT')
  })

  it('Unknown country → 3. SPANIEN + OVRIGT (fallback)', () => {
    const r = resolveHome(makeBottle({ country: 'Lebanon', region: 'Bekaa', wine: 'Musar' }))
    expect(r!.category).toBe('3. SPANIEN + OVRIGT')
  })
})

describe('HOME bin rules — style overrides region', () => {
  it('Champagne → 5. BUBBEL (beats France)', () => {
    const r = resolveHome(makeBottle({ country: 'France', region: 'Champagne', wine: 'Gosset Champagne Zero', wineType: 'White - Sparkling' }))
    expect(r!.category).toBe('5. BUBBEL')
  })

  it('Crémant → 5. BUBBEL', () => {
    const r = resolveHome(makeBottle({ country: 'France', region: 'Burgundy', wine: 'Clotilde Davenne Crémant de Bourgogne', wineType: 'White - Sparkling' }))
    expect(r!.category).toBe('5. BUBBEL')
  })

  it('Rosé Sparkling → 5. BUBBEL', () => {
    const r = resolveHome(makeBottle({ country: 'France', region: 'Champagne', wine: 'Roederer Rosé', wineType: 'Rosé - Sparkling' }))
    expect(r!.category).toBe('5. BUBBEL')
  })

  it('White Riesling → 6. VITA', () => {
    const r = resolveHome(makeBottle({ country: 'Germany', region: 'Mosel', wine: 'Loosen Riesling Spätlese', wineType: 'White' }))
    expect(r!.category).toBe('6. VITA')
  })

  it('White Off-dry → 6. VITA (not sweet)', () => {
    const r = resolveHome(makeBottle({ country: 'Germany', region: 'Mosel', wine: 'Kuntz Feinherb', wineType: 'White - Off-dry' }))
    expect(r!.category).toBe('6. VITA')
  })

  it('Chablis → 6. VITA', () => {
    const r = resolveHome(makeBottle({ country: 'France', region: 'Burgundy', wine: 'Fevre Chablis GC Les Clos', wineType: 'White' }))
    expect(r!.category).toBe('6. VITA')
  })

  it('Cabernet Sauvignon (Red) does NOT match VITA', () => {
    const r = resolveHome(makeBottle({ country: 'Bolivia', wine: 'Kohlberg Cabernet Sauvignon Icono', wineType: 'Red' }))
    expect(r!.category).toBe('3. SPANIEN + OVRIGT')
  })
})

describe('HOME bin rules — full bin ID with sub-location', () => {
  it('Italian drink-soon → Lgh 1. ITALIA', () => {
    const r = resolveHome(makeBottle({ country: 'Italy', beginConsume: 2025, endConsume: 2029 }))
    expect(r!.fullBinId).toBe('Lgh 1. ITALIA')
  })

  it('Italian no window → Lagringsskåp (under 0.9 limit)', () => {
    const r = resolveHome(makeBottle({ country: 'Italy', beginConsume: null, endConsume: null }))
    expect(r!.fullBinId).toBe('Lgh 1. ITALIA')
  })

  it('French past-peak expensive → Cooler', () => {
    const r = resolveHome(makeBottle({ country: 'France', region: 'Rhône', wine: 'VT CdP', endConsume: 2025, cost: 600 }))
    expect(r!.fullBinId).toBe('Cooler')
  })
})
