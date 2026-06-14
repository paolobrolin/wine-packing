import { describe, it, expect } from 'vitest'
import { determineHomeSubLocation, buildHomeBinId } from '../../src/bins/home-sub-location'
import type { Bottle } from '../../src/rules/types'

function makeBottle(overrides: Partial<Bottle> = {}): Bottle {
  return {
    barcode: '0001', iwine: 1, vintage: '2020', wine: 'Test Wine',
    producer: 'Test', country: 'France', region: 'Bordeaux', size: '750ml',
    cost: 500, beginConsume: 2025, endConsume: 2030,
    currentLocation: null, currentBin: null, owcGroup: null, wineType: null,
    ...overrides,
  }
}

describe('determineHomeSubLocation', () => {
  const YEAR = 2026

  it('past-peak expensive wine → Cooler', () => {
    const b = makeBottle({ endConsume: 2025, cost: 600 })
    expect(determineHomeSubLocation(b, YEAR)).toBe('Cooler')
  })

  it('past-peak cheap wine → NOT Cooler', () => {
    const b = makeBottle({ endConsume: 2025, cost: 100 })
    expect(determineHomeSubLocation(b, YEAR)).not.toBe('Cooler')
  })

  it('end within 3 years → Lagringsskåp', () => {
    const b = makeBottle({ beginConsume: 2024, endConsume: 2029 })
    expect(determineHomeSubLocation(b, YEAR)).toBe('Lagringsskåp')
  })

  it('end beyond 3 years → Källaren', () => {
    const b = makeBottle({ beginConsume: 2025, endConsume: 2040 })
    expect(determineHomeSubLocation(b, YEAR)).toBe('Källaren')
  })

  it('no drink window data → Källaren', () => {
    const b = makeBottle({ beginConsume: null, endConsume: null })
    expect(determineHomeSubLocation(b, YEAR)).toBe('Källaren')
  })

  it('boundary: end = currentYear+3 → Lagringsskåp', () => {
    const b = makeBottle({ endConsume: 2029 })
    expect(determineHomeSubLocation(b, YEAR)).toBe('Lagringsskåp')
  })

  it('boundary: end = currentYear+4 → Källaren', () => {
    const b = makeBottle({ endConsume: 2030 })
    expect(determineHomeSubLocation(b, YEAR)).toBe('Källaren')
  })

  it('boundary: end = currentYear (past-peak) + expensive → Cooler', () => {
    const b = makeBottle({ endConsume: 2026, cost: 500 })
    expect(determineHomeSubLocation(b, YEAR)).not.toBe('Cooler')
  })

  it('boundary: end = currentYear - 1 (past-peak) + expensive → Cooler', () => {
    const b = makeBottle({ endConsume: 2025, cost: 500 })
    expect(determineHomeSubLocation(b, YEAR)).toBe('Cooler')
  })

  it('null cost treated as 0 → not Cooler even if past-peak', () => {
    const b = makeBottle({ endConsume: 2020, cost: null })
    expect(determineHomeSubLocation(b, YEAR)).not.toBe('Cooler')
  })
})

describe('buildHomeBinId', () => {
  it('Lagringsskåp → "Lgh" prefix', () => {
    expect(buildHomeBinId('1. ITALIA', 'Lagringsskåp')).toBe('Lgh 1. ITALIA')
  })

  it('Källaren → "Kall" prefix', () => {
    expect(buildHomeBinId('2. FRANKRIKE', 'Källaren')).toBe('Kall 2. FRANKRIKE')
  })

  it('Cooler → just "Cooler" regardless of category', () => {
    expect(buildHomeBinId('1. ITALIA', 'Cooler')).toBe('Cooler')
  })
})
