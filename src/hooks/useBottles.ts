import { useState, useEffect, useCallback } from 'react'
import { getSupabase } from '../data/supabase'
import type { DbBottle } from '../data/models'
import { fetchBottlesNeedingMove, fetchBottlesByState, fetchBottlesByTrip, fetchHomeBottles } from '../data/queries'
import type { BottleState } from '../rules/state-machine'

type BottleFilter =
  | { type: 'needs-move' }
  | { type: 'by-state'; state: BottleState }
  | { type: 'by-trip'; tripId: string }
  | { type: 'home' }

export function useBottles(filter: BottleFilter) {
  const [bottles, setBottles] = useState<DbBottle[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [initialized, setInitialized] = useState(false)

  const load = useCallback(async () => {
    try {
      if (!initialized) setLoading(true)
      let data: DbBottle[]
      switch (filter.type) {
        case 'needs-move':
          data = await fetchBottlesNeedingMove()
          break
        case 'by-state':
          data = await fetchBottlesByState(filter.state)
          break
        case 'by-trip':
          data = await fetchBottlesByTrip(filter.tripId)
          break
        case 'home':
          data = await fetchHomeBottles()
          break
      }
      setBottles(data)
      setError(null)
      setInitialized(true)
    } catch (e) {
      console.error('useBottles error:', e)
      setError(e instanceof Error ? e : new Error(String(e)))
    } finally {
      setLoading(false)
    }
  }, [filter.type, 'state' in filter ? filter.state : '', 'tripId' in filter ? filter.tripId : ''])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    const channelName = `bottles-${filter.type}-${'state' in filter ? filter.state : 'all'}`
    const sub = getSupabase()
      .channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bottles' }, () => { load() })
      .subscribe()

    return () => { sub.unsubscribe() }
  }, [load, filter.type])

  return { bottles, loading, error, refresh: load }
}

export function groupByShelf(bottles: DbBottle[]): Map<string, DbBottle[]> {
  const groups = new Map<string, DbBottle[]>()
  for (const b of bottles) {
    const key = b.recommended_bin ?? b.current_bin ?? 'Unassigned'
    const group = groups.get(key) ?? []
    group.push(b)
    groups.set(key, group)
  }
  return groups
}

export function groupBySource(bottles: DbBottle[]): Map<string, DbBottle[]> {
  const groups = new Map<string, DbBottle[]>()
  for (const b of bottles) {
    const key = b.current_bin ?? b.current_location ?? 'Unknown'
    const group = groups.get(key) ?? []
    group.push(b)
    groups.set(key, group)
  }
  return groups
}

export function groupByOwc(bottles: DbBottle[]): { owc: Map<string, DbBottle[]>; loose: DbBottle[] } {
  const owc = new Map<string, DbBottle[]>()
  const loose: DbBottle[] = []
  for (const b of bottles) {
    if (b.owc_group) {
      const group = owc.get(b.owc_group) ?? []
      group.push(b)
      owc.set(b.owc_group, group)
    } else {
      loose.push(b)
    }
  }
  return { owc, loose }
}
