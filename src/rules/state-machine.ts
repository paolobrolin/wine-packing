export type BottleState = 'pending' | 'packed' | 'in_transit' | 'shelved' | 'synced'

const VALID_TRANSITIONS: Record<BottleState, BottleState[]> = {
  pending: ['packed'],
  packed: ['in_transit', 'shelved', 'pending'],
  in_transit: ['shelved', 'packed'],
  shelved: ['synced'],
  synced: [],
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
