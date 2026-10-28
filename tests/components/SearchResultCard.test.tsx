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

describe('SearchResultCard verdict without recommendation', () => {
  it('shows the current bin (e.g. Lugnet) instead of HOME', () => {
    const bottle = makeDbBottle({ current_bin: 'Lugnet', recommended_location: null, recommended_bin: null })
    render(<SearchResultCard result={scored(bottle, 'no-move')} onDone={() => {}} />)
    expect(screen.getByText('LUGNET')).toBeInTheDocument()
    expect(screen.queryByText('HOME')).not.toBeInTheDocument()
  })

  it('falls back to the location when there is no bin (Ekholmen)', () => {
    const bottle = makeDbBottle({ current_location: 'Ekholmen', current_bin: null, recommended_location: null, recommended_bin: null })
    render(<SearchResultCard result={scored(bottle, 'no-move')} onDone={() => {}} />)
    expect(screen.getByText('EKHOLMEN')).toBeInTheDocument()
  })

  it('still shows HOME for a home bottle with no bin', () => {
    const bottle = makeDbBottle({ current_location: 'Cellar', current_bin: null, recommended_location: null, recommended_bin: null })
    render(<SearchResultCard result={scored(bottle, 'no-move')} onDone={() => {}} />)
    expect(screen.getByText('HOME')).toBeInTheDocument()
  })
})

describe('SearchResultCard verdict for done bottles', () => {
  it('a done bottle placed elsewhere by hand reads IN PLACE where it is, not MOVE TO', () => {
    const bottle = makeDbBottle({
      state: 'synced', current_location: 'Cellar', current_bin: 'Lgh 3. SPANIEN + OVRIGT',
      recommended_location: 'HOME', recommended_bin: 'Kall 3. SPANIEN + OVRIGT',
    })
    render(<SearchResultCard result={scored(bottle, 'no-move')} onDone={() => {}} />)
    expect(screen.getByText('IN PLACE Lgh 3. SPANIEN + OVRIGT')).toBeInTheDocument()
    expect(screen.queryByText(/MOVE TO/)).not.toBeInTheDocument()
  })

  it('a done Lugnet bottle (no recommendation) still reads LUGNET', () => {
    const bottle = makeDbBottle({ state: 'synced', current_bin: 'Lugnet', recommended_location: null, recommended_bin: null })
    render(<SearchResultCard result={scored(bottle, 'no-move')} onDone={() => {}} />)
    expect(screen.getByText('LUGNET')).toBeInTheDocument()
  })

  it('a done bottle placed by hand is not styled as a move', () => {
    const bottle = makeDbBottle({ state: 'synced', current_bin: 'Lgh 3. SPANIEN + OVRIGT', recommended_location: 'HOME', recommended_bin: 'Kall 3. SPANIEN + OVRIGT' })
    render(<SearchResultCard result={scored(bottle, 'no-move')} onDone={() => {}} />)
    expect(screen.getByTestId('search-0001').className).not.toMatch(/search-card--(move|rebin)/)
  })

  it('a done bottle without a bin says where it is, not IN PLACE <recommendation>', () => {
    const bottle = makeDbBottle({ state: 'synced', current_location: 'Cellar', current_bin: null, recommended_location: 'HOME', recommended_bin: 'Lgh 3. SPANIEN + OVRIGT' })
    render(<SearchResultCard result={scored(bottle, 'no-move')} onDone={() => {}} />)
    expect(screen.getByText('HOME')).toBeInTheDocument()
    expect(screen.queryByText(/IN PLACE/)).not.toBeInTheDocument()
  })
})
