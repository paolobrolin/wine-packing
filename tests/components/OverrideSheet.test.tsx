import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { OverrideSheet } from '../../src/components/OverrideSheet'
import type { DbBottle } from '../../src/data/models'

function makeDbBottle(overrides: Partial<DbBottle> = {}): DbBottle {
  return {
    barcode: '0001', iwine: 1, vintage: '2020', wine: 'Test Wine',
    producer: 'Test', country: 'France', region: 'Bordeaux', size: '750ml',
    cost: 500, cost_currency: 'SEK', wine_type: null,
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

describe('OverrideSheet', () => {
  it('renders with bottle name', () => {
    render(<OverrideSheet bottle={makeDbBottle()} onConfirm={() => {}} onCancel={() => {}} />)
    expect(screen.getByText(/2020.*Test Wine/)).toBeInTheDocument()
  })

  it('shows FROM with current bin', () => {
    render(<OverrideSheet bottle={makeDbBottle()} onConfirm={() => {}} onCancel={() => {}} />)
    expect(screen.getByText('Källaren')).toBeInTheDocument()
  })

  it('pre-selects recommended bin in dropdown', () => {
    render(<OverrideSheet bottle={makeDbBottle()} onConfirm={() => {}} onCancel={() => {}} />)
    const select = screen.getByTestId('override-select') as HTMLSelectElement
    expect(select.value).toBe('2.1 BDX LB')
  })

  it('shows REMOTE bins for REMOTE destination', () => {
    render(<OverrideSheet bottle={makeDbBottle({ recommended_location: 'REMOTE' })} onConfirm={() => {}} onCancel={() => {}} />)
    const select = screen.getByTestId('override-select')
    expect(select).toContainHTML('3.4 BARBARESCO')
    expect(select).toContainHTML('1.5 NAPA')
  })

  it('shows HOME bins for HOME destination', () => {
    render(<OverrideSheet bottle={makeDbBottle({ recommended_location: 'HOME', recommended_bin: 'Lgh 2. FRANKRIKE' })} onConfirm={() => {}} onCancel={() => {}} />)
    const select = screen.getByTestId('override-select')
    expect(select).toContainHTML('Lgh 1. ITALIA')
    expect(select).toContainHTML('Cooler')
  })

  it('calls onConfirm with null overrideBin when keeping recommendation', async () => {
    const onConfirm = vi.fn()
    render(<OverrideSheet bottle={makeDbBottle()} onConfirm={onConfirm} onCancel={() => {}} />)
    await userEvent.click(screen.getByTestId('override-confirm'))
    expect(onConfirm).toHaveBeenCalledWith('0001', null)
  })

  it('calls onConfirm with new bin when overriding', async () => {
    const onConfirm = vi.fn()
    render(<OverrideSheet bottle={makeDbBottle()} onConfirm={onConfirm} onCancel={() => {}} />)
    await userEvent.selectOptions(screen.getByTestId('override-select'), '3.4 BARBARESCO')
    await userEvent.click(screen.getByTestId('override-confirm'))
    expect(onConfirm).toHaveBeenCalledWith('0001', '3.4 BARBARESCO')
  })

  it('calls onCancel when Cancel clicked', async () => {
    const onCancel = vi.fn()
    render(<OverrideSheet bottle={makeDbBottle()} onConfirm={() => {}} onCancel={onCancel} />)
    await userEvent.click(screen.getByText('Cancel'))
    expect(onCancel).toHaveBeenCalled()
  })

  it('calls onCancel when backdrop clicked', async () => {
    const onCancel = vi.fn()
    render(<OverrideSheet bottle={makeDbBottle()} onConfirm={() => {}} onCancel={onCancel} />)
    await userEvent.click(screen.getByText(/2020.*Test Wine/).closest('.override-sheet__backdrop')!)
    expect(onCancel).toHaveBeenCalled()
  })
})
