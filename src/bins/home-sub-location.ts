import type { Bottle } from '../rules/types'

export type HomeSubLocation = 'Lagringsskåp' | 'Källaren' | 'Cooler'

const SHELF_CAPACITY = 35
const SHELVES_PER_CABINET = 6
const CABINET_CAPACITY = SHELF_CAPACITY * SHELVES_PER_CABINET

export function determineHomeSubLocation(
  bottle: Bottle,
  currentYear: number,
  lghCount?: number,
  kallCount?: number,
): HomeSubLocation {
  const end = bottle.endConsume
  const cost = bottle.cost ?? 0

  if (end != null && end < currentYear && cost >= 500) {
    return 'Cooler'
  }

  const drinkSoon = end != null && end <= currentYear + 3
  const lghFull = (lghCount ?? 0) >= CABINET_CAPACITY
  const kallFull = (kallCount ?? 0) >= CABINET_CAPACITY

  if (drinkSoon) {
    return lghFull ? 'Källaren' : 'Lagringsskåp'
  }

  if (end != null && end <= currentYear + 5) {
    const lghRoom = CABINET_CAPACITY - (lghCount ?? 0)
    const kallRoom = CABINET_CAPACITY - (kallCount ?? 0)
    return lghRoom >= kallRoom ? 'Lagringsskåp' : 'Källaren'
  }

  return kallFull ? 'Lagringsskåp' : 'Källaren'
}

export function buildHomeBinId(
  category: string,
  subLocation: HomeSubLocation,
): string {
  if (subLocation === 'Cooler') return 'Cooler'
  const prefix = subLocation === 'Lagringsskåp' ? 'Lgh' : 'Kall'
  return `${prefix} ${category}`
}
