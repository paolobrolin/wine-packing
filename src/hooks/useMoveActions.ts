import { useCallback } from 'react'
import { transitionBottle, transitionBatch, assignToTrip, createTrip, completeTrip } from '../data/queries'

type ExtraFields = { current_location?: string; current_bin?: string | null }

export function useMoveActions() {
  const pack = useCallback((barcode: string, extra?: ExtraFields) => transitionBottle(barcode, 'packed', extra), [])
  const unpack = useCallback((barcode: string, extra?: ExtraFields) => transitionBottle(barcode, 'pending', extra), [])
  const startTransit = useCallback((barcode: string, extra?: ExtraFields) => transitionBottle(barcode, 'in_transit', extra), [])
  const shelve = useCallback((barcode: string, extra?: ExtraFields) => transitionBottle(barcode, 'shelved', extra), [])
  const sync = useCallback((barcode: string, extra?: ExtraFields) => transitionBottle(barcode, 'synced', extra), [])

  const packBatch = useCallback((barcodes: string[]) => transitionBatch(barcodes, 'packed'), [])
  const shelveBatch = useCallback((barcodes: string[]) => transitionBatch(barcodes, 'shelved'), [])
  const transitBatch = useCallback((barcodes: string[]) => transitionBatch(barcodes, 'in_transit'), [])

  const planTrip = useCallback(async (barcodes: string[], notes?: string) => {
    const trip = await createTrip(notes)
    await assignToTrip(barcodes, trip.id)
    return trip
  }, [])

  const finishTrip = useCallback((tripId: string) => completeTrip(tripId), [])

  return { pack, unpack, startTransit, shelve, sync, packBatch, shelveBatch, transitBatch, planTrip, finishTrip }
}
