import type { DbBottle } from '../data/models'
import { reverseTransition, type BottleState } from './state-machine'

// Undo and reset write these fields straight to the row instead of going
// through transitionBottle: the transition machine rejects shelved → pending,
// and none of its transitions restore the bin, so undo used to fail silently
// and leave the row at the destination.

export type RestoreFields = Pick<DbBottle, 'state' | 'current_bin' | 'current_location'>
  & Partial<Pick<DbBottle, 'recommended_bin' | 'packed_at' | 'in_transit_at' | 'shelved_at' | 'synced_at'>>

/** Toast undo: put back the exact snapshot taken before the action. */
export function undoFields(before: DbBottle): RestoreFields {
  return {
    state: before.state,
    current_bin: before.current_bin,
    current_location: before.current_location,
    recommended_bin: before.recommended_bin,
    packed_at: before.packed_at,
    in_transit_at: before.in_transit_at,
    shelved_at: before.shelved_at,
    synced_at: before.synced_at,
  }
}

/** Card Undo: one state back. Back to pending also means back to CT's position. */
export function stepBackFields(bottle: DbBottle): RestoreFields {
  const prev = reverseTransition(bottle.state as BottleState)
  if (prev === 'pending') {
    return { state: 'pending', current_bin: bottle.ct_bin_at_sync, current_location: bottle.ct_location_at_sync, packed_at: null }
  }
  const cleared = prev === 'packed' ? { shelved_at: null, in_transit_at: null } : prev === 'in_transit' ? { shelved_at: null } : {}
  return { state: prev, current_bin: bottle.current_bin, current_location: bottle.current_location, ...cleared }
}

/** Reset: pending at CT's position, all move timestamps cleared. */
export function resetFields(bottle: DbBottle): RestoreFields {
  return {
    state: 'pending',
    current_bin: bottle.ct_bin_at_sync,
    current_location: bottle.ct_location_at_sync,
    packed_at: null,
    in_transit_at: null,
    shelved_at: null,
  }
}

/**
 * Keep here: the bottle stays where it physically is. A packed or in-transit
 * bottle carries its destination in current_bin, so it goes back to CT's
 * position; otherwise the next sync would record it at the destination.
 */
export function keepHereFields(bottle: DbBottle): RestoreFields {
  if (bottle.state === 'packed' || bottle.state === 'in_transit') {
    return { state: 'synced', current_bin: bottle.ct_bin_at_sync, current_location: bottle.ct_location_at_sync, packed_at: null, in_transit_at: null }
  }
  return { state: 'synced', current_bin: bottle.current_bin, current_location: bottle.current_location }
}
