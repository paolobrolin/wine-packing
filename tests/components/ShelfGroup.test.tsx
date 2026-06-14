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
    render(<ShelfGroup shelfName="2.1 BDX LB" bottles={bottles} onDone={() => {}} onBatchDone={() => {}} />)
    expect(screen.getByTestId('shelf-2.1 BDX LB')).toBeInTheDocument()
    expect(screen.getByText('3 fl')).toBeInTheDocument()
  })

  it('shows progress', () => {
    render(<ShelfGroup shelfName="2.1 BDX LB" bottles={bottles} onDone={() => {}} onBatchDone={() => {}} />)
    expect(screen.getByText('0/3')).toBeInTheDocument()
  })

  it('shows Done All when all pending', () => {
    render(<ShelfGroup shelfName="2.1 BDX LB" bottles={bottles} onDone={() => {}} onBatchDone={() => {}} />)
    expect(screen.getByText('Done All ▸')).toBeInTheDocument()
  })

  it('calls onBatchDone with all barcodes on Done All', async () => {
    const onBatch = vi.fn()
    render(<ShelfGroup shelfName="2.1 BDX LB" bottles={bottles} onDone={() => {}} onBatchDone={onBatch} />)
    await userEvent.click(screen.getByText('Done All ▸'))
    expect(onBatch).toHaveBeenCalledWith(['001', '002', '003'])
  })

  it('hides Done All when not all actionable', () => {
    const mixed = [
      makeDbBottle({ barcode: '001', state: 'pending' }),
      makeDbBottle({ barcode: '002', state: 'shelved' }),
    ]
    render(<ShelfGroup shelfName="test" bottles={mixed} onDone={() => {}} onBatchDone={() => {}} />)
    expect(screen.queryByText('Done All ▸')).not.toBeInTheDocument()
  })

  it('shows capacity bar when provided', () => {
    render(<ShelfGroup shelfName="test" bottles={bottles} capacity={{ current: 8, max: 20 }} onDone={() => {}} onBatchDone={() => {}} />)
    expect(screen.getByText('8/20')).toBeInTheDocument()
  })

  it('shows Done All for in_transit bottles', () => {
    const transitBottles = [
      makeDbBottle({ barcode: '001', state: 'in_transit' }),
      makeDbBottle({ barcode: '002', state: 'in_transit' }),
    ]
    render(<ShelfGroup shelfName="test" bottles={transitBottles} onDone={() => {}} onBatchDone={() => {}} />)
    expect(screen.getByText('Done All ▸')).toBeInTheDocument()
  })

  it('renders OWC bottles as group card', () => {
    const owcBottles = [
      makeDbBottle({ barcode: '001', owc_group: 'PdB 2020' }),
      makeDbBottle({ barcode: '002', owc_group: 'PdB 2020' }),
      makeDbBottle({ barcode: '003', owc_group: null }),
    ]
    render(<ShelfGroup shelfName="test" bottles={owcBottles} onDone={() => {}} onBatchDone={() => {}} />)
    expect(screen.getByText('OWC: PdB 2020')).toBeInTheDocument()
    expect(screen.getByText('2 fl')).toBeInTheDocument()
  })
})
