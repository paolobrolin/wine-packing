import { getSupabase } from './supabase'
import { needsMove, type DbBottle, type DbBin, type DbTrip } from './models'
import type { BottleState } from '../rules/state-machine'
import { canTransition, timestampField } from '../rules/state-machine'

export async function fetchBottlesNeedingMove(): Promise<DbBottle[]> {
  const { data, error } = await getSupabase()
    .from('bottles')
    .select('*')
    .not('recommended_location', 'is', null)
    .neq('state', 'synced')
    .order('recommended_bin')
    .order('producer')
    .order('vintage')

  if (error) throw error
  return (data ?? []).filter((b: DbBottle) => needsMove(b))
}

export async function fetchBottlesByState(state: BottleState): Promise<DbBottle[]> {
  const { data, error } = await getSupabase()
    .from('bottles')
    .select('*')
    .eq('state', state)
    .order('recommended_bin')

  if (error) throw error
  return data ?? []
}

export async function fetchBottlesByTrip(tripId: string): Promise<DbBottle[]> {
  const { data, error } = await getSupabase()
    .from('bottles')
    .select('*')
    .eq('trip_id', tripId)
    .order('recommended_bin')

  if (error) throw error
  return data ?? []
}

export async function fetchBins(): Promise<DbBin[]> {
  const { data, error } = await getSupabase()
    .from('bins')
    .select('*')
    .order('bin_id')

  if (error) throw error
  return data ?? []
}

export async function fetchTrips(): Promise<DbTrip[]> {
  const { data, error } = await getSupabase()
    .from('trips')
    .select('*')
    .order('planned_at', { ascending: false })

  if (error) throw error
  return data ?? []
}

export async function transitionBottle(barcode: string, to: BottleState): Promise<DbBottle> {
  const { data: current, error: fetchError } = await getSupabase()
    .from('bottles')
    .select('state')
    .eq('barcode', barcode)
    .single()

  if (fetchError) throw fetchError
  if (!canTransition(current.state as BottleState, to)) {
    throw new Error(`Invalid transition: ${current.state} → ${to}`)
  }

  const tsField = timestampField(to)
  const updates: Record<string, unknown> = {
    state: to,
    updated_at: new Date().toISOString(),
  }
  if (tsField) updates[tsField] = new Date().toISOString()

  const { data, error } = await getSupabase()
    .from('bottles')
    .update(updates)
    .eq('barcode', barcode)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function transitionBatch(barcodes: string[], to: BottleState): Promise<{ success: number; failures: string[] }> {
  let success = 0
  const failures: string[] = []

  for (const barcode of barcodes) {
    try {
      await transitionBottle(barcode, to)
      success++
    } catch {
      failures.push(barcode)
    }
  }

  return { success, failures }
}

export async function assignToTrip(barcodes: string[], tripId: string): Promise<void> {
  const { error } = await getSupabase()
    .from('bottles')
    .update({ trip_id: tripId, updated_at: new Date().toISOString() })
    .in('barcode', barcodes)

  if (error) throw error
}

export async function createTrip(notes?: string): Promise<DbTrip> {
  const { data, error } = await getSupabase()
    .from('trips')
    .insert({ notes: notes ?? null })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function completeTrip(tripId: string): Promise<void> {
  const { error } = await getSupabase()
    .from('trips')
    .update({ completed_at: new Date().toISOString() })
    .eq('id', tripId)

  if (error) throw error
}

export async function fetchAllBottles(): Promise<DbBottle[]> {
  const { data, error } = await getSupabase()
    .from('bottles')
    .select('*')
    .order('producer')
    .order('vintage')

  if (error) throw error
  return data ?? []
}

export async function fetchHomeBottles(): Promise<DbBottle[]> {
  const { data, error } = await getSupabase()
    .from('bottles')
    .select('*')
    .or('current_location.is.null,current_location.neq.REMOTE')
    .order('end_consume', { ascending: true, nullsFirst: false })

  if (error) throw error
  return data ?? []
}

export async function dismissRecommendation(barcode: string): Promise<void> {
  const { error } = await getSupabase()
    .from('bottles')
    .update({
      recommended_location: null,
      recommended_bin: null,
      move_reason: null,
      rule_id: null,
      state: 'synced',
      synced_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('barcode', barcode)

  if (error) throw error
}
