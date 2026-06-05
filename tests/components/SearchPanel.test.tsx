/**
 * SearchPanel integration tests — verify that typing in the input
 * produces visible, correct results. These tests would have caught
 * both the useDeferredValue stale-results bug and the ranking bug.
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SearchPanel } from '../../src/components/SearchPanel'
import type { DbBottle } from '../../src/data/models'

function mb(overrides: Partial<DbBottle>): DbBottle {
  return {
    barcode: '0001', iwine: 1, vintage: '2020', wine: 'Test Wine',
    producer: 'Test', country: 'France', region: 'Bordeaux', size: '750ml',
    cost: 500, cost_currency: 'SEK', begin_consume: 2025, end_consume: 2045,
    current_location: 'Cellar', current_bin: 'Källaren',
    recommended_location: 'REMOTE', recommended_bin: '2.1 BDX LB',
    move_reason: 'midpoint', rule_id: 'midpoint',
    state: 'pending', packed_at: null, in_transit_at: null,
    shelved_at: null, synced_at: null, trip_id: null, owc_group: null,
    ct_location_at_sync: null, ct_bin_at_sync: null,
    created_at: '', updated_at: '',
    ...overrides,
  }
}

const bottles: DbBottle[] = [
  mb({ barcode: 'B01', iwine: 1, producer: 'Oddero', wine: 'Oddero Barolo Brunate', vintage: '2021', recommended_bin: '3.3 BAROLO CLASSIC' }),
  mb({ barcode: 'B02', iwine: 2, producer: 'Au Bon Climat', wine: 'Au Bon Climat Chardonnay Santa Barbara County', vintage: '2023', recommended_bin: '1.8 NEW WORLD OTHER' }),
  mb({ barcode: 'B03', iwine: 3, producer: 'Kongsgaard', wine: 'Kongsgaard Chardonnay', vintage: '2019', recommended_location: null, recommended_bin: null }),
]

describe('SearchPanel', () => {
  it('shows no results for empty input', () => {
    render(<SearchPanel bottles={bottles} mode="packing" onPack={() => {}} />)
    expect(screen.queryByText(/NEEDS ACTION/)).not.toBeInTheDocument()
  })

  it('shows no results for single character', async () => {
    render(<SearchPanel bottles={bottles} mode="packing" onPack={() => {}} />)
    await userEvent.type(screen.getByPlaceholderText('Search wines...'), 'b')
    expect(screen.queryByText(/NEEDS ACTION/)).not.toBeInTheDocument()
  })

  it('shows results for two characters', async () => {
    render(<SearchPanel bottles={bottles} mode="packing" onPack={() => {}} />)
    await userEvent.type(screen.getByPlaceholderText('Search wines...'), 'ba')
    expect(screen.getByText(/NEEDS ACTION/)).toBeInTheDocument()
  })

  it('displays matching wine names in results', async () => {
    render(<SearchPanel bottles={bottles} mode="packing" onPack={() => {}} />)
    await userEvent.type(screen.getByPlaceholderText('Search wines...'), 'barolo')
    expect(screen.getByText(/Oddero Barolo Brunate/)).toBeInTheDocument()
  })

  it('results update when query changes', async () => {
    render(<SearchPanel bottles={bottles} mode="packing" onPack={() => {}} />)
    const input = screen.getByPlaceholderText('Search wines...')

    await userEvent.type(input, 'oddero')
    expect(screen.getByText(/Oddero Barolo/)).toBeInTheDocument()
    expect(screen.queryByText(/Kongsgaard/)).not.toBeInTheDocument()

    await userEvent.clear(input)
    await userEvent.type(input, 'kongs')
    expect(screen.queryByText(/Oddero/)).not.toBeInTheDocument()
    expect(screen.getByText(/Kongsgaard/)).toBeInTheDocument()
  })

  it('shows verdict banner MOVE for bottles that need to move', async () => {
    render(<SearchPanel bottles={bottles} mode="packing" onPack={() => {}} />)
    await userEvent.type(screen.getByPlaceholderText('Search wines...'), 'barolo')
    expect(screen.getByText(/MOVE → 3.3 BAROLO CLASSIC/)).toBeInTheDocument()
  })

  it('shows verdict banner STAYS HOME for home bottles', async () => {
    render(<SearchPanel bottles={bottles} mode="packing" onPack={() => {}} />)
    await userEvent.type(screen.getByPlaceholderText('Search wines...'), 'kongs')
    expect(screen.getByText(/STAYS HOME/)).toBeInTheDocument()
  })

  it('calls onPack when Pack button is clicked', async () => {
    const onPack = vi.fn()
    render(<SearchPanel bottles={bottles} mode="packing" onPack={onPack} />)
    await userEvent.type(screen.getByPlaceholderText('Search wines...'), 'barolo')
    await userEvent.click(screen.getByText('Pack'))
    expect(onPack).toHaveBeenCalledWith('B01')
  })

  it('clears input after Pack action', async () => {
    render(<SearchPanel bottles={bottles} mode="packing" onPack={() => {}} />)
    const input = screen.getByPlaceholderText('Search wines...')
    await userEvent.type(input, 'barolo')
    await userEvent.click(screen.getByText('Pack'))
    // Auto-clear happens after 300ms setTimeout
    await new Promise(r => setTimeout(r, 400))
    expect(input).toHaveValue('')
  })

  it('shows "No bottles match" for unmatched query', async () => {
    render(<SearchPanel bottles={bottles} mode="packing" onPack={() => {}} />)
    await userEvent.type(screen.getByPlaceholderText('Search wines...'), 'zzznotawine')
    expect(screen.getByText(/No bottles match/)).toBeInTheDocument()
  })

  it('clear button resets search', async () => {
    render(<SearchPanel bottles={bottles} mode="packing" onPack={() => {}} />)
    await userEvent.type(screen.getByPlaceholderText('Search wines...'), 'barolo')
    expect(screen.getByText(/Oddero/)).toBeInTheDocument()
    await userEvent.click(screen.getByText('×'))
    expect(screen.queryByText(/NEEDS ACTION/)).not.toBeInTheDocument()
  })
})
