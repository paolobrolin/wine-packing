import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ShelfGroup } from '../../src/components/ShelfGroup'
import type { DbBottle } from '../../src/data/models'

function makeDbBottle(overrides: Partial<DbBottle> = {}): DbBottle {
  return {
    barcode: '0001', iwine: 1, vintage: '2020', wine: 'Test', producer: 'Test',
    country: 'France', region: 'Bordeaux', size: '750ml', cost: 500, cost_currency: 'SEK',
    begin_consume: 2025, end_consume: 2035,
    current_location: 'Cellar', current_bin: 'Källaren',
    recommended_location: 'REMOTE', recommended_bin: '2.1 BDX LB',
    move_reason: 'midpoint', rule_id: 'midpoint',
    state: 'pending', packed_at: null, in_transit_at: null, shelved_at: null, synced_at: null,
    trip_id: null, owc_group: null,
    ct_location_at_sync: null, ct_bin_at_sync: null,
    created_at: '', updated_at: '',
    ...overrides,
  }
}

describe('ShelfGroup', () => {
  const bottles = [
    makeDbBottle({ barcode: '001' }),
    makeDbBottle({ barcode: '002' }),
    makeDbBottle({ barcode: '003' }),
  ]

  it('shows shelf name and count', () => {
    render(<ShelfGroup shelfName="2.1 BDX LB" bottles={bottles} mode="packing" onAction={() => {}} onBatchAction={() => {}} />)
    expect(screen.getByTestId('shelf-2.1 BDX LB')).toBeInTheDocument()
    expect(screen.getByText('3 fl')).toBeInTheDocument()
  })

  it('shows progress', () => {
    render(<ShelfGroup shelfName="2.1 BDX LB" bottles={bottles} mode="packing" onAction={() => {}} onBatchAction={() => {}} />)
    expect(screen.getByText('0/3')).toBeInTheDocument()
  })

  it('shows Pack All when all pending in packing mode', () => {
    render(<ShelfGroup shelfName="2.1 BDX LB" bottles={bottles} mode="packing" onAction={() => {}} onBatchAction={() => {}} />)
    expect(screen.getByText('Pack All ▸')).toBeInTheDocument()
  })

  it('calls onBatchAction with all barcodes on Pack All', async () => {
    const onBatch = vi.fn()
    render(<ShelfGroup shelfName="2.1 BDX LB" bottles={bottles} mode="packing" onAction={() => {}} onBatchAction={onBatch} />)
    await userEvent.click(screen.getByText('Pack All ▸'))
    expect(onBatch).toHaveBeenCalledWith(['001', '002', '003'])
  })

  it('hides Pack All when not all pending', () => {
    const mixed = [
      makeDbBottle({ barcode: '001', state: 'pending' }),
      makeDbBottle({ barcode: '002', state: 'packed' }),
    ]
    render(<ShelfGroup shelfName="test" bottles={mixed} mode="packing" onAction={() => {}} onBatchAction={() => {}} />)
    expect(screen.queryByText('Pack All ▸')).not.toBeInTheDocument()
  })

  it('shows capacity bar when provided', () => {
    render(<ShelfGroup shelfName="test" bottles={bottles} mode="packing" capacity={{ current: 8, max: 20 }} onAction={() => {}} onBatchAction={() => {}} />)
    expect(screen.getByText('8/20')).toBeInTheDocument()
  })

  it('renders OWC bottles as group card', () => {
    const owcBottles = [
      makeDbBottle({ barcode: '001', owc_group: 'PdB 2020' }),
      makeDbBottle({ barcode: '002', owc_group: 'PdB 2020' }),
      makeDbBottle({ barcode: '003', owc_group: null }),
    ]
    render(<ShelfGroup shelfName="test" bottles={owcBottles} mode="packing" onAction={() => {}} onBatchAction={() => {}} />)
    expect(screen.getByText('OWC: PdB 2020')).toBeInTheDocument()
    expect(screen.getByText('2 fl')).toBeInTheDocument()
  })
})
