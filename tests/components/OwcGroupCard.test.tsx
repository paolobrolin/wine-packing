import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { OwcGroupCard } from '../../src/components/OwcGroupCard'
import type { DbBottle } from '../../src/data/models'

function makeDbBottle(overrides: Partial<DbBottle> = {}): DbBottle {
  return {
    barcode: '0001', iwine: 1, vintage: '2020', wine: 'PdB Riserva Asili',
    producer: 'PdB', country: 'Italy', region: 'Piedmont', size: '750ml',
    cost: 55, cost_currency: 'EUR', begin_consume: 2026, end_consume: 2050,
    current_location: 'Cellar', current_bin: null,
    recommended_location: 'REMOTE', recommended_bin: '3.4 BARBARESCO',
    move_reason: null, rule_id: null,
    state: 'pending', packed_at: null, in_transit_at: null, shelved_at: null, synced_at: null,
    trip_id: null, owc_group: 'PdB 2020 Riserve',
    ct_location_at_sync: null, ct_bin_at_sync: null,
    created_at: '', updated_at: '',
    ...overrides,
  }
}

const bottles = [
  makeDbBottle({ barcode: '001', wine: 'PdB Riserva Asili' }),
  makeDbBottle({ barcode: '002', wine: 'PdB Riserva Montefico' }),
  makeDbBottle({ barcode: '003', wine: 'PdB Riserva Ovello' }),
]

describe('OwcGroupCard', () => {
  it('shows group name and count', () => {
    render(<OwcGroupCard groupName="PdB 2020 Riserve" bottles={bottles} mode="packing" onActionAll={() => {}} />)
    expect(screen.getByText('OWC: PdB 2020 Riserve')).toBeInTheDocument()
    expect(screen.getByText('3 fl')).toBeInTheDocument()
  })

  it('shows Pack Case button in packing mode when all pending', () => {
    render(<OwcGroupCard groupName="PdB 2020" bottles={bottles} mode="packing" onActionAll={() => {}} />)
    expect(screen.getByText('Pack Case ▸')).toBeInTheDocument()
  })

  it('calls onActionAll with all barcodes', async () => {
    const onAction = vi.fn()
    render(<OwcGroupCard groupName="PdB 2020" bottles={bottles} mode="packing" onActionAll={onAction} />)
    await userEvent.click(screen.getByText('Pack Case ▸'))
    expect(onAction).toHaveBeenCalledWith(['001', '002', '003'])
  })

  it('hides Pack Case when not all pending', () => {
    const mixed = [
      makeDbBottle({ barcode: '001', state: 'pending' }),
      makeDbBottle({ barcode: '002', state: 'packed' }),
    ]
    render(<OwcGroupCard groupName="Test" bottles={mixed} mode="packing" onActionAll={() => {}} />)
    expect(screen.queryByText('Pack Case ▸')).not.toBeInTheDocument()
  })

  it('expands to show individual bottles', async () => {
    render(<OwcGroupCard groupName="PdB 2020" bottles={bottles} mode="packing" onActionAll={() => {}} />)
    expect(screen.queryByText(/PdB Riserva Asili/)).not.toBeInTheDocument()
    await userEvent.click(screen.getByText('▸ Show bottles'))
    expect(screen.getByText(/PdB Riserva Asili/)).toBeInTheDocument()
    expect(screen.getByText(/PdB Riserva Montefico/)).toBeInTheDocument()
  })

  it('shows Shelve Case in unpacking mode when all packed', () => {
    const packed = bottles.map((b) => ({ ...b, state: 'packed' as const }))
    render(<OwcGroupCard groupName="PdB 2020" bottles={packed} mode="unpacking" onActionAll={() => {}} />)
    expect(screen.getByText('Shelve Case ▸')).toBeInTheDocument()
  })
})
