import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { HomeView } from '../../src/components/HomeView'
import type { DbBottle } from '../../src/data/models'

function makeDbBottle(overrides: Partial<DbBottle> = {}): DbBottle {
  return {
    barcode: '0001', iwine: 1, vintage: '2020', wine: 'Test Wine', producer: 'Test',
    country: 'France', region: 'Bordeaux', size: '750ml', cost: 500, cost_currency: 'SEK',
    begin_consume: 2024, end_consume: 2032,
    current_location: 'Cellar', current_bin: 'Källaren',
    recommended_location: null, recommended_bin: null,
    move_reason: null, rule_id: null,
    state: 'pending', packed_at: null, in_transit_at: null, shelved_at: null, synced_at: null,
    trip_id: null, owc_group: null,
    ct_location_at_sync: null, ct_bin_at_sync: null,
    created_at: '', updated_at: '',
    ...overrides,
  }
}

describe('HomeView', () => {
  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date('2026-06-04')) })
  afterEach(() => { vi.useRealTimers() })

  it('shows past-peak wines', () => {
    const bottles = [makeDbBottle({ vintage: '1999', wine: 'Chateau Musar', end_consume: 2011 })]
    render(<HomeView bottles={bottles} />)
    expect(screen.getByText(/Drink Now/)).toBeInTheDocument()
    expect(screen.getByText(/1999 Chateau Musar/)).toBeInTheDocument()
    expect(screen.getByText(/15y over/)).toBeInTheDocument()
  })

  it('shows approaching-peak wines', () => {
    const bottles = [makeDbBottle({ vintage: '2023', wine: 'Cornelissen Susucaru', begin_consume: 2024, end_consume: 2027 })]
    render(<HomeView bottles={bottles} />)
    expect(screen.getByText(/Approaching Peak/)).toBeInTheDocument()
    expect(screen.getByText(/2023 Cornelissen Susucaru/)).toBeInTheDocument()
  })

  it('shows correctly stored count', () => {
    const bottles = [makeDbBottle({ begin_consume: 2030, end_consume: 2050 })]
    render(<HomeView bottles={bottles} />)
    expect(screen.getByText(/Correctly Stored \(1\)/)).toBeInTheDocument()
  })

  it('handles empty list', () => {
    render(<HomeView bottles={[]} />)
    expect(screen.getByText(/Correctly Stored \(0\)/)).toBeInTheDocument()
  })
})
