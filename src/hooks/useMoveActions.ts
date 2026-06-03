import { useCallback } from 'react'
import { transitionBottle, transitionBatch, assignToTrip, createTrip, completeTrip } from '../data/queries'

export function useMoveActions() {
  const pack = useCallback((barcode: string) => transitionBottle(barcode, 'packed'), [])
  const unpack = useCallback((barcode: string) => transitionBottle(barcode, 'pending'), [])
  const startTransit = useCallback((barcode: string) => transitionBottle(barcode, 'in_transit'), [])
  const shelve = useCallback((barcode: string) => transitionBottle(barcode, 'shelved'), [])

  const packBatch = useCallback((barcodes: string[]) => transitionBatch(barcodes, 'packed'), [])
  const shelveBatch = useCallback((barcodes: string[]) => transitionBatch(barcodes, 'shelved'), [])
  const transitBatch = useCallback((barcodes: string[]) => transitionBatch(barcodes, 'in_transit'), [])

  const planTrip = useCallback(async (barcodes: string[], notes?: string) => {
    const trip = await createTrip(notes)
    await assignToTrip(barcodes, trip.id)
    return trip
  }, [])

  const finishTrip = useCallback((tripId: string) => completeTrip(tripId), [])

  return { pack, unpack, startTransit, shelve, packBatch, shelveBatch, transitBatch, planTrip, finishTrip }
}
