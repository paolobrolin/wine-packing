import type { DbBottle } from '../data/models'
import { moveType } from '../data/models'

export type BottleState = 'pending' | 'packed' | 'in_transit' | 'shelved' | 'synced'

const VALID_TRANSITIONS: Record<BottleState, BottleState[]> = {
  pending: ['packed', 'synced'],
  packed: ['in_transit', 'shelved', 'pending'],
  in_transit: ['shelved', 'packed'],
  shelved: ['synced', 'packed'],
  synced: ['pending'],
}

const REVERSE_MAP: Partial<Record<BottleState, BottleState>> = {
  packed: 'pending',
  in_transit: 'packed',
  shelved: 'packed',
  synced: 'pending',
}

export function canTransition(from: BottleState, to: BottleState): boolean {
  return VALID_TRANSITIONS[from].includes(to)
}

export function transition(from: BottleState, to: BottleState): BottleState {
  if (!canTransition(from, to)) {
    throw new Error(`Invalid transition: ${from} → ${to}`)
  }
  return to
}

export function inferTransition(bottle: DbBottle): BottleState {
  const mt = moveType(bottle)
  if (bottle.state === 'pending' && mt === 'cross-location') return 'packed'
  if (bottle.state === 'pending' && mt === 'within-location') return 'synced'
  if (bottle.state === 'packed' || bottle.state === 'in_transit') return 'shelved'
  throw new Error(`No valid Done transition for state=${bottle.state}, moveType=${mt}`)
}

export function reverseTransition(state: BottleState): BottleState {
  const reverse = REVERSE_MAP[state]
  if (reverse == null) throw new Error(`No reverse transition for state=${state}`)
  return reverse
}

export function timestampField(state: BottleState): string | null {
  const fields: Record<BottleState, string | null> = {
    pending: null,
    packed: 'packed_at',
    in_transit: 'in_transit_at',
    shelved: 'shelved_at',
    synced: 'synced_at',
  }
  return fields[state]
}
