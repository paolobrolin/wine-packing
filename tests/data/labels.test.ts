import { describe, it, expect } from 'vitest'
import { labelThumbUrl, labelFullUrl, parseLabelRef, looksBlocked } from '../../src/data/labels'

const UUID = '530f1583-0277-46b1-acb5-78c51590a265'
const CAP = '291f2e0d-a3ff-4513-84f4-7288ab63e1e0'

describe('label URLs', () => {
  it('builds a thumbnail URL from a label ref', () => {
    expect(labelThumbUrl(`labels/${UUID}`)).toBe(`https://cdn.ct-static.com/labels/${UUID}_100x.jpg`)
  })

  it('builds a full-size URL from a label ref', () => {
    expect(labelFullUrl(`labels/${UUID}`)).toBe(`https://cdn.ct-static.com/labels/${UUID}.jpg`)
  })

  it('builds URLs for app captures, which live in a different CDN folder', () => {
    expect(labelThumbUrl(`captures/${CAP}`)).toBe(`https://cdn.ct-static.com/captures/${CAP}_100x.jpg`)
    expect(labelFullUrl(`captures/${CAP}`)).toBe(`https://cdn.ct-static.com/captures/${CAP}.jpg`)
  })

  it('returns null for wines without an image', () => {
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

describe('parseLabelRef', () => {
  it('extracts a label ref from an editwine.asp image tag', () => {
    const html = `<a class="img_wrap" href="label.asp?iWine=1&amp;iLabel=2&amp;CK=abc"><img src='https://cdn.ct-static.com/labels/${UUID}_100x.jpg' height='65' alt='label' /></a>`
    expect(parseLabelRef(html)).toBe(`labels/${UUID}`)
  })

  it('extracts a capture ref when the wine only has an app photo', () => {
    const html = `<img src='https://cdn.ct-static.com/captures/${CAP}_100x.jpg' alt='label capture' />`
    expect(parseLabelRef(html)).toBe(`captures/${CAP}`)
  })

  it('prefers a curated label over an app capture when the wine has both', () => {
    const html = `<img src='https://cdn.ct-static.com/captures/${CAP}_100x.jpg' />
                  <img src='https://cdn.ct-static.com/labels/${UUID}_100x.jpg' />`
    expect(parseLabelRef(html)).toBe(`labels/${UUID}`)
  })

  it('ignores CDN assets that are not bottle imagery', () => {
    const html = `<img src="https://cdn.ct-static.com/img/ct_logo.png" />
                  <img src="https://cdn.ct-static.com/img/photo_blank_small.gif" />
                  <link href="https://cdn.ct-static.com/dist/css/ct.min.690a99a1ac.css" />`
    expect(parseLabelRef(html)).toBeNull()
  })

  it('returns null for a page with no images at all', () => {
    expect(parseLabelRef('<html><body>ingen bild</body></html>')).toBeNull()
  })
})

describe('looksBlocked', () => {
  it('accepts a full editwine.asp page', () => {
    expect(looksBlocked(200, 39668)).toBe(false)
  })

  it('flags a WAF/Kasada rejection status', () => {
    expect(looksBlocked(405, 39668)).toBe(true)
    expect(looksBlocked(429, 39668)).toBe(true)
    expect(looksBlocked(403, 39668)).toBe(true)
  })

  it('flags a 200 with an empty or stub body — an expired aws-waf-token', () => {
    expect(looksBlocked(200, 0)).toBe(true)
    expect(looksBlocked(200, 1219)).toBe(true)
  })

  it('does not flag a page that is merely short but plausible', () => {
    expect(looksBlocked(200, 20000)).toBe(false)
  })
})
