import { describe, it, expect } from 'vitest'
import { labelThumbUrl, labelFullUrl } from '../../src/data/labels'

const UUID = '530f1583-0277-46b1-acb5-78c51590a265'

describe('label URLs', () => {
  it('builds a thumbnail URL', () => {
    expect(labelThumbUrl(UUID)).toBe(`https://cdn.ct-static.com/labels/${UUID}_100x.jpg`)
  })

  it('builds a full-size URL', () => {
    expect(labelFullUrl(UUID)).toBe(`https://cdn.ct-static.com/labels/${UUID}.jpg`)
  })

  it('returns null for wines without a label', () => {
    expect(labelThumbUrl(null)).toBeNull()
    expect(labelFullUrl(null)).toBeNull()
    expect(labelThumbUrl(undefined)).toBeNull()
    expect(labelFullUrl(undefined)).toBeNull()
  })

  it('returns null for an empty string rather than a broken URL', () => {
    expect(labelThumbUrl('')).toBeNull()
    expect(labelFullUrl('')).toBeNull()
  })
})
