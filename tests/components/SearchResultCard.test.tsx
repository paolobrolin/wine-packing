import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SearchResultCard } from '../../src/components/SearchResultCard'
import type { DbBottle } from '../../src/data/models'
import type { ScoredBottle } from '../../src/search/types'

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
    trip_id: null, owc_group: null, estimated_value: null, value_source: null, label_ref: null,
    ct_location_at_sync: null, ct_bin_at_sync: null,
    created_at: '', updated_at: '',
    ...overrides,
  }
}

function scored(bottle: DbBottle, tier: ScoredBottle['tier'] = 'needs-action'): ScoredBottle {
  return { bottle, score: 100, tier }
}

describe('SearchResultCard reset', () => {
  it('shows Reset button on shelved bottles', () => {
    const bottle = makeDbBottle({ state: 'shelved', shelved_at: '2026-06-15T00:00:00Z' })
    render(<SearchResultCard result={scored(bottle, 'no-move')} onDone={() => {}} onReset={() => {}} />)
    expect(screen.getByText('Reset')).toBeInTheDocument()
  })

  it('shows Reset button on packed bottles', () => {
    const bottle = makeDbBottle({ state: 'packed', packed_at: '2026-06-15T00:00:00Z' })
    render(<SearchResultCard result={scored(bottle, 'needs-action')} onDone={() => {}} onReset={() => {}} />)
    expect(screen.getByText('Reset')).toBeInTheDocument()
  })

  it('does NOT show Reset on synced bottles', () => {
    const bottle = makeDbBottle({ state: 'synced', synced_at: '2026-06-15T00:00:00Z' })
    render(<SearchResultCard result={scored(bottle, 'no-move')} onDone={() => {}} onReset={() => {}} />)
    expect(screen.queryByText('Reset')).not.toBeInTheDocument()
  })

  it('does NOT show Reset on pending bottles', () => {
    const bottle = makeDbBottle({ state: 'pending' })
    render(<SearchResultCard result={scored(bottle, 'needs-action')} onDone={() => {}} onReset={() => {}} />)
    expect(screen.queryByText('Reset')).not.toBeInTheDocument()
  })

  it('requires confirmation — first click shows "Confirm reset?", second click fires onReset', async () => {
    const onReset = vi.fn()
    const bottle = makeDbBottle({ state: 'shelved', shelved_at: '2026-06-15T00:00:00Z' })
    render(<SearchResultCard result={scored(bottle, 'no-move')} onDone={() => {}} onReset={onReset} />)

    await userEvent.click(screen.getByText('Reset'))
    expect(onReset).not.toHaveBeenCalled()
    expect(screen.getByText('Confirm reset?')).toBeInTheDocument()

    await userEvent.click(screen.getByText('Confirm reset?'))
    expect(onReset).toHaveBeenCalledWith('0001')
  })

  it('does NOT show Reset when onReset prop is not provided', () => {
    const bottle = makeDbBottle({ state: 'shelved', shelved_at: '2026-06-15T00:00:00Z' })
    render(<SearchResultCard result={scored(bottle, 'no-move')} onDone={() => {}} />)
    expect(screen.queryByText('Reset')).not.toBeInTheDocument()
  })
})

describe('SearchResultCard label thumbnail', () => {
  const UUID = 'labels/530f1583-0277-46b1-acb5-78c51590a265'

  it('shows the label thumbnail when the wine has one', () => {
    const bottle = makeDbBottle({ label_ref: UUID })
    render(<SearchResultCard result={scored(bottle)} onDone={() => {}} />)

    const img = screen.getByRole('img') as HTMLImageElement
    expect(img.src).toBe(`https://cdn.ct-static.com/${UUID}_100x.jpg`)
  })

  it('renders an app capture photo for wines with no curated label', () => {
    const ref = 'captures/291f2e0d-a3ff-4513-84f4-7288ab63e1e0'
    render(<SearchResultCard result={scored(makeDbBottle({ label_ref: ref }))} onDone={() => {}} />)

    const img = screen.getByRole('img') as HTMLImageElement
    expect(img.src).toBe(`https://cdn.ct-static.com/${ref}_100x.jpg`)
  })

  it('renders no image when the wine has no label', () => {
    render(<SearchResultCard result={scored(makeDbBottle({ label_ref: null }))} onDone={() => {}} />)
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })

  it('labels the thumbnail with the wine name for screen readers', () => {
    const bottle = makeDbBottle({ label_ref: UUID, wine: 'Oddero Barolo Brunate', vintage: '2021' })
    render(<SearchResultCard result={scored(bottle)} onDone={() => {}} />)

    expect(screen.getByRole('img')).toHaveAttribute('alt', expect.stringContaining('Oddero Barolo Brunate'))
  })

  it('links the thumbnail to the full-size image', () => {
    const bottle = makeDbBottle({ label_ref: UUID })
    render(<SearchResultCard result={scored(bottle)} onDone={() => {}} />)

    const link = screen.getByRole('img').closest('a')
    expect(link).toHaveAttribute('href', `https://cdn.ct-static.com/${UUID}.jpg`)
  })

  it('does not fire the row action when the thumbnail is clicked', async () => {
    const onDone = vi.fn()
    const bottle = makeDbBottle({ label_ref: UUID })
    render(<SearchResultCard result={scored(bottle)} onDone={onDone} />)

    await userEvent.click(screen.getByRole('img'))
    expect(onDone).not.toHaveBeenCalled()
  })
})
