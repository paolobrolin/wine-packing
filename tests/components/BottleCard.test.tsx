import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BottleCard } from '../../src/components/BottleCard'
import type { DbBottle } from '../../src/data/models'

function makeDbBottle(overrides: Partial<DbBottle> = {}): DbBottle {
  return {
    barcode: '0207097736', iwine: 1, vintage: '2018', wine: 'Colgin IX Estate',
    producer: 'Colgin', country: 'USA', region: 'California', size: '750ml',
    cost: 8499, cost_currency: 'SEK', wine_type: null, begin_consume: 2023, end_consume: 2045,
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
    render(<BottleCard bottle={makeDbBottle()} onDone={() => {}} />)
    expect(screen.getByText(/2018.*Colgin IX Estate/)).toBeInTheDocument()
  })

  it('shows cost', () => {
    render(<BottleCard bottle={makeDbBottle()} onDone={() => {}} />)
    expect(screen.getByText(/8,499 kr/)).toBeInTheDocument()
  })

  it('shows drink window', () => {
    render(<BottleCard bottle={makeDbBottle()} onDone={() => {}} />)
    expect(screen.getByText('2023–2045')).toBeInTheDocument()
  })

  it('shows destination bin', () => {
    render(<BottleCard bottle={makeDbBottle()} onDone={() => {}} />)
    expect(screen.getByText('→ REMOTE 1.5 COLGIN')).toBeInTheDocument()
  })

  it('shows size tag for non-750ml', () => {
    render(<BottleCard bottle={makeDbBottle({ size: '1.5L' })} onDone={() => {}} />)
    expect(screen.getByText('1.5L')).toBeInTheDocument()
  })

  it('calls onDone when tapped with pending state', async () => {
    const onDone = vi.fn()
    render(<BottleCard bottle={makeDbBottle()} onDone={onDone} />)
    await userEvent.click(screen.getByTestId('bottle-0207097736'))
    expect(onDone).toHaveBeenCalledWith('0207097736')
  })

  it('calls onDone when packed (undo)', async () => {
    const onDone = vi.fn()
    render(<BottleCard bottle={makeDbBottle({ state: 'packed' })} onDone={onDone} />)
    await userEvent.click(screen.getByTestId('bottle-0207097736'))
    expect(onDone).toHaveBeenCalledWith('0207097736')
  })

  it('calls onDone when in_transit', async () => {
    const onDone = vi.fn()
    render(<BottleCard bottle={makeDbBottle({ state: 'in_transit' })} onDone={onDone} />)
    await userEvent.click(screen.getByTestId('bottle-0207097736'))
    expect(onDone).toHaveBeenCalledWith('0207097736')
  })

  it('shows pending indicator for pending state', () => {
    render(<BottleCard bottle={makeDbBottle()} onDone={() => {}} />)
    expect(screen.getByText('○')).toBeInTheDocument()
  })

  it('shows packed indicator (half-circle)', () => {
    render(<BottleCard bottle={makeDbBottle({ state: 'packed' })} onDone={() => {}} />)
    expect(screen.getByText('◐')).toBeInTheDocument()
  })

  it('shows shelved indicator', () => {
    render(<BottleCard bottle={makeDbBottle({ state: 'shelved' })} onDone={() => {}} />)
    expect(screen.getByText('✓')).toBeInTheDocument()
  })

  it('shows Done button for pending bottles that need to move', () => {
    render(<BottleCard bottle={makeDbBottle()} onDone={() => {}} />)
    expect(screen.getByText('Pack')).toBeInTheDocument()
  })

  it('does not show Done button for shelved bottles', () => {
    render(<BottleCard bottle={makeDbBottle({ state: 'shelved' })} onDone={() => {}} />)
    expect(screen.queryByText('Pack')).not.toBeInTheDocument()
  })

  it('does not show Done button for synced bottles', () => {
    const bottle = makeDbBottle({
      state: 'synced',
      recommended_location: 'HOME',
      current_bin: 'Lgh 2. FRANKRIKE',
      recommended_bin: 'Lgh 2. FRANKRIKE',
    })
    render(<BottleCard bottle={bottle} onDone={() => {}} />)
    expect(screen.queryByText('Pack')).not.toBeInTheDocument()
  })

  it('shows Undo button for packed bottles when onUndo provided', () => {
    render(<BottleCard bottle={makeDbBottle({ state: 'packed' })} onDone={() => {}} onUndo={() => {}} />)
    expect(screen.getByText('Undo')).toBeInTheDocument()
  })

  it('calls onUndo when Undo clicked on packed bottle', async () => {
    const onUndo = vi.fn()
    render(<BottleCard bottle={makeDbBottle({ state: 'packed' })} onDone={() => {}} onUndo={onUndo} />)
    await userEvent.click(screen.getByText('Undo'))
    expect(onUndo).toHaveBeenCalledWith('0207097736')
  })

  it('does not show Undo for pending bottles', () => {
    render(<BottleCard bottle={makeDbBottle({ state: 'pending' })} onDone={() => {}} onUndo={() => {}} />)
    expect(screen.queryByText('Undo')).not.toBeInTheDocument()
  })
})
