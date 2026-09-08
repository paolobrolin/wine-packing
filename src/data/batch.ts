import type { DbBottle } from './models'
import type { BottleState } from '../rules/state-machine'
import { inferTransition, timestampField } from '../rules/state-machine'

/**
 * One bottle's move in a batch, with everything needed to both apply it and
 * revert it. `prev*` fields are captured before the move so a single undo can
 * restore the whole group even after the component re-renders.
 */
export interface BatchStep {
  barcode: string
  nextState: BottleState
  bin: string | null
  tsField: string | null
  prevState: BottleState
  prevBin: string | null
  prevPackedAt: string | null
  prevShelvedAt: string | null
  prevSyncedAt: string | null
}

export interface BatchPlan {
  steps: BatchStep[]
  /** Bottles with no valid forward move (already synced with nothing to change). */
  skipped: string[]
  /** Shared destination when every step targets the same bin, else null. */
  destination: string | null
}

/**
 * Work out what a "Done All" should do, without touching state.
 *
 * Bottles that are already synced or shelved get rebinned in place (state stays
 * synced) — the same carve-out `handleConfirmDone` makes, because
 * `inferTransition` has no forward move for those states.
 */
export function planBatch(bottles: DbBottle[]): BatchPlan {
  const steps: BatchStep[] = []
  const skipped: string[] = []

  for (const b of bottles) {
    const bin = b.recommended_bin
    const prev = {
      prevState: b.state,
      prevBin: b.current_bin,
      prevPackedAt: b.packed_at,
      prevShelvedAt: b.shelved_at,
      prevSyncedAt: b.synced_at,
    }

    if (b.state === 'synced' || b.state === 'shelved') {
      // Nothing to do when it is already sitting in its recommended bin.
      if (bin == null || b.current_bin === bin) {
        skipped.push(b.barcode)
        continue
      }
      steps.push({ barcode: b.barcode, nextState: 'synced', bin, tsField: 'synced_at', ...prev })
      continue
    }

    let nextState: BottleState
    try {
      nextState = inferTransition(b)
    } catch {
      skipped.push(b.barcode)
      continue
    }
    steps.push({ barcode: b.barcode, nextState, bin, tsField: timestampField(nextState), ...prev })
  }

  const bins = new Set(steps.map((s) => s.bin))
  return { steps, skipped, destination: bins.size === 1 ? (steps[0]?.bin ?? null) : null }
}

/** Human-readable summary for the batch toast. */
export function batchSummary(plan: BatchPlan): string {
  const n = plan.steps.length
  if (n === 0) return 'Nothing to move'
  const what = n === 1 ? '1 bottle' : `${n} bottles`
  return plan.destination ? `${what} → ${plan.destination}` : what
}
