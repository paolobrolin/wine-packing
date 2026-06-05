import { describe, it, expect } from 'vitest'
import { displayVintage, displayCost } from '../../src/data/format'

describe('displayVintage', () => {
  it('returns "NV" for CT sentinel value 1001', () => {
    expect(displayVintage('1001')).toBe('NV')
  })
  it('returns "NV" for null', () => {
    expect(displayVintage(null)).toBe('NV')
  })
  it('returns the vintage for normal years', () => {
    expect(displayVintage('2021')).toBe('2021')
  })
})

describe('displayCost', () => {
  it('returns null for null cost', () => {
    expect(displayCost(null, 'SEK')).toBeNull()
  })
  it('shows kr for SEK', () => {
    expect(displayCost(399, 'SEK')).toBe('399 kr')
  })
  it('shows € for EUR', () => {
    expect(displayCost(55, 'EUR')).toBe('55 €')
  })
  it('shows $ for USD', () => {
    expect(displayCost(280, 'USD')).toBe('280 $')
  })
  it('defaults to kr for null currency', () => {
    expect(displayCost(500, null)).toBe('500 kr')
  })
})
