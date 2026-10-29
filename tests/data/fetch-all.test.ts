import { describe, it, expect, vi } from 'vitest'

// 1 308 rows behind a PostgREST that returns at most 1 000 per request.
const ROWS = Array.from({ length: 1308 }, (_, i) => ({ barcode: String(i).padStart(4, '0'), state: i % 2 ? 'synced' : 'pending', current_location: 'REMOTE' }))
vi.mock('../../src/data/supabase', () => ({
  getSupabase: () => ({
    from: () => ({
      select: () => ({
        order: () => ({
          range: async (from: number, to: number) => ({ data: ROWS.slice(from, Math.min(to + 1, from + 1000)), error: null }),
        }),
      }),
    }),
  }),
}))

import { fetchAllBottles } from '../../src/data/queries'

// Search has to find every bottle, also one already done at external storage.
describe('fetchAllBottles', () => {
  it('returns every row, past the 1 000-row page limit, done ones included', async () => {
    const all = await fetchAllBottles()
    expect(all).toHaveLength(1308)
    expect(all.filter((b) => b.state === 'synced').length).toBe(654)
  })
})
