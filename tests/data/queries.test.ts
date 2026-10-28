import { describe, it, expect, vi, beforeEach } from 'vitest'

const updates: Record<string, unknown>[] = []
vi.mock('../../src/data/supabase', () => ({
  getSupabase: () => ({
    from: () => ({
      update: (u: Record<string, unknown>) => { updates.push(u); return { eq: async () => ({ error: null }) } },
    }),
  }),
}))

import { rebinBottle, dismissRecommendation } from '../../src/data/queries'

// The recommendation column is the rules' output. A placement chosen by hand is
// the bottle's position, not a new recommendation: overwriting the column made
// the next sync read it as "recommendation changed" and reopen the move.
describe('placement writes leave the recommendation alone', () => {
  beforeEach(() => { updates.length = 0 })

  it('rebinBottle writes the bin and done state, not recommended_bin', async () => {
    await rebinBottle('0001', 'Lgh 3. SPANIEN + OVRIGT')
    expect(updates[0]).toMatchObject({ current_bin: 'Lgh 3. SPANIEN + OVRIGT', state: 'synced' })
    expect(updates[0]).not.toHaveProperty('recommended_bin')
  })

  it('dismissRecommendation (Keep here) marks done without clearing the recommendation', async () => {
    await dismissRecommendation('0001')
    expect(updates[0]).toMatchObject({ state: 'synced' })
    expect(updates[0]).not.toHaveProperty('recommended_location')
    expect(updates[0]).not.toHaveProperty('recommended_bin')
  })
})
