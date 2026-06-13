import type { BottleState } from '../rules/state-machine'

export interface DbBottle {
  barcode: string
  iwine: number
  vintage: string | null
  wine: string
  producer: string | null
  country: string | null
  region: string | null
  size: string
  cost: number | null
  cost_currency: string
  wine_type: string | null
  begin_consume: number | null
  end_consume: number | null
  current_location: string | null
  current_bin: string | null
  recommended_location: string | null
  recommended_bin: string | null
  move_reason: string | null
  rule_id: string | null
  state: BottleState
  packed_at: string | null
  in_transit_at: string | null
  shelved_at: string | null
  synced_at: string | null
  trip_id: string | null
  owc_group: string | null
  ct_location_at_sync: string | null
  ct_bin_at_sync: string | null
  created_at: string
  updated_at: string
}

export interface DbBin {
  bin_id: string
  location: string
  cabinet: number | null
  shelf: number | null
  capacity: number
  current_count: number
  notes: string | null
  created_at: string
}

export interface DbTrip {
  id: string
  planned_at: string
  started_at: string | null
  completed_at: string | null
  bottle_count: number
  notes: string | null
}

export function needsMove(bottle: DbBottle): boolean {
  if (bottle.recommended_location == null) return false
  if (bottle.current_location !== bottle.recommended_location) return true
  if (bottle.recommended_bin == null) return false
  return bottle.current_bin !== bottle.recommended_bin
}

export function isOverdue(bottle: DbBottle, now: Date, thresholdMs = 2 * 60 * 60 * 1000): boolean {
  if (bottle.state !== 'packed' && bottle.state !== 'in_transit') return false
  const ts = bottle.state === 'packed' ? bottle.packed_at : bottle.in_transit_at
  if (ts == null) return false
  return now.getTime() - new Date(ts).getTime() > thresholdMs
}
