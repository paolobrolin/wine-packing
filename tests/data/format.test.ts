import { describe, it, expect } from 'vitest'
import { displayVintage } from '../../src/data/format'

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
