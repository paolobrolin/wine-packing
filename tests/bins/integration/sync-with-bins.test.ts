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
      Country: 'France', Region: 'Bordeaux',
    },
    ...overrides,
  }
}

describe('buildSyncRows with bin resolution', () => {
  it('assigns REMOTE bin for Bordeaux LB wine', () => {
    const ct = makeCtBottle({
      extra: { Vintage: '2020', Wine: 'Château Ducru-Beaucaillou', Producer: 'Château Ducru-Beaucaillou', Country: 'France', Region: 'Bordeaux' },
    })
    const { rows } = buildSyncRows([ct], new Map(), 2026)
    expect(rows[0].recommended_location).toBe('REMOTE')
    expect(rows[0].recommended_bin).toBe('2.1 BDX LB')
  })

  it('assigns REMOTE bin for SQN wine', () => {
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
    expect(rows[0].recommended_bin).toBe('2.5 CHAMPAGNE')
  })

  it('does not assign bin for HOME bottles (no recommended_location)', () => {
    const ct = makeCtBottle({ begin_consume: 2024, end_consume: 2028 })
    const { rows } = buildSyncRows([ct], new Map(), 2026)
    expect(rows[0].recommended_location).toBeNull()
    expect(rows[0].recommended_bin).toBeNull()
  })

  it('assigns global fallback for unknown country', () => {
    const ct = makeCtBottle({
      extra: { Vintage: '2020', Wine: 'Unknown Wine', Producer: 'Unknown', Country: 'Lebanon', Region: 'Bekaa' },
    })
    const { rows } = buildSyncRows([ct], new Map(), 2026)
    expect(rows[0].recommended_location).toBe('REMOTE')
    expect(rows[0].recommended_bin).toBe('2.8 DE OTHER')
  })
})
