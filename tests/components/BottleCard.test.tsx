import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BottleCard } from '../../src/components/BottleCard'
import type { DbBottle } from '../../src/data/models'

function makeDbBottle(overrides: Partial<DbBottle> = {}): DbBottle {
  return {
    barcode: '0207097736', iwine: 1, vintage: '2018', wine: 'Colgin IX Estate',
    producer: 'Colgin', country: 'USA', region: 'California', size: '750ml',
    cost: 8499, cost_currency: 'SEK', begin_consume: 2023, end_consume: 2045,
    current_location: 'Cellar', current_bin: 'Lagringsskåp',
    recommended_location: 'REMOTE', recommended_bin: '1.5 COLGIN',
    move_reason: 'midpoint 2034 (8y away)', rule_id: 'midpoint',
    state: 'pending', packed_at: null, in_transit_at: null, shelved_at: null, synced_at: null,
    trip_id: null, owc_group: null,
    ct_location_at_sync: null, ct_bin_at_sync: null,
    created_at: '', updated_at: '',
    ...overrides,
  }
}

describe('BottleCard', () => {
  it('renders wine name and vintage', () => {
    render(<BottleCard bottle={makeDbBottle()} mode="packing" onAction={() => {}} />)
    expect(screen.getByText(/2018.*Colgin IX Estate/)).toBeInTheDocument()
  })

  it('shows cost', () => {
    render(<BottleCard bottle={makeDbBottle()} mode="packing" onAction={() => {}} />)
    expect(screen.getByText(/8,499 kr/)).toBeInTheDocument()
  })

  it('shows drink window', () => {
    render(<BottleCard bottle={makeDbBottle()} mode="packing" onAction={() => {}} />)
    expect(screen.getByText('2023–2045')).toBeInTheDocument()
  })

  it('shows destination bin', () => {
    render(<BottleCard bottle={makeDbBottle()} mode="packing" onAction={() => {}} />)
    expect(screen.getByText('→ 1.5 COLGIN')).toBeInTheDocument()
  })

  it('shows move reason', () => {
    render(<BottleCard bottle={makeDbBottle()} mode="packing" onAction={() => {}} />)
    expect(screen.getByText('midpoint 2034 (8y away)')).toBeInTheDocument()
  })

  it('shows size tag for non-750ml', () => {
    render(<BottleCard bottle={makeDbBottle({ size: '1.5L' })} mode="packing" onAction={() => {}} />)
    expect(screen.getByText('1.5L')).toBeInTheDocument()
  })

  it('calls onAction when tapped in packing mode with pending state', async () => {
    const onAction = vi.fn()
    render(<BottleCard bottle={makeDbBottle()} mode="packing" onAction={onAction} />)
    await userEvent.click(screen.getByTestId('bottle-0207097736'))
    expect(onAction).toHaveBeenCalledWith('0207097736')
  })

  it('calls onAction in packing mode when packed (undo)', async () => {
    const onAction = vi.fn()
    render(<BottleCard bottle={makeDbBottle({ state: 'packed' })} mode="packing" onAction={onAction} />)
    await userEvent.click(screen.getByTestId('bottle-0207097736'))
    expect(onAction).toHaveBeenCalledWith('0207097736')
  })

  it('calls onAction in unpacking mode when in_transit', async () => {
    const onAction = vi.fn()
    render(<BottleCard bottle={makeDbBottle({ state: 'in_transit' })} mode="unpacking" onAction={onAction} />)
    await userEvent.click(screen.getByTestId('bottle-0207097736'))
    expect(onAction).toHaveBeenCalledWith('0207097736')
  })

  it('shows pending indicator for pending state', () => {
    render(<BottleCard bottle={makeDbBottle()} mode="packing" onAction={() => {}} />)
    expect(screen.getByText('○')).toBeInTheDocument()
  })

  it('shows packed indicator', () => {
    render(<BottleCard bottle={makeDbBottle({ state: 'packed' })} mode="packing" onAction={() => {}} />)
    expect(screen.getByText('●')).toBeInTheDocument()
  })

  it('shows shelved indicator', () => {
    render(<BottleCard bottle={makeDbBottle({ state: 'shelved' })} mode="packing" onAction={() => {}} />)
    expect(screen.getByText('✓')).toBeInTheDocument()
  })
})
