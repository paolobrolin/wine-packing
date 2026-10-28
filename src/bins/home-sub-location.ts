import type { Bottle } from '../rules/types'

export type HomeSubLocation = 'Lagringsskåp' | 'Källaren' | 'Cooler'

/**
 * Past its drinking window and worth 500 kr or more → the Cooler, to be drunk
 * soon. Everything else is placed by the home layout (src/bins/home/layout.ts),
 * which decides between the cabinet and Källaren by shelf capacity.
 */
export function determineHomeSubLocation(bottle: Bottle, currentYear: number): HomeSubLocation {
  const end = bottle.endConsume
  const cost = bottle.cost ?? 0
  if (end != null && end < currentYear && cost >= 500) return 'Cooler'
  return 'Lagringsskåp'
}
