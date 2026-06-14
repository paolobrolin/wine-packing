import type { Bottle } from '../rules/types'

export type HomeSubLocation = 'Lagringsskåp' | 'Källaren' | 'Cooler'

export function determineHomeSubLocation(
  bottle: Bottle,
  currentYear: number,
): HomeSubLocation {
  const end = bottle.endConsume
  const cost = bottle.cost ?? 0

  if (end != null && end < currentYear && cost >= 500) {
    return 'Cooler'
  }

  if (end != null && end <= currentYear + 3) {
    return 'Lagringsskåp'
  }

  return 'Källaren'
}

export function buildHomeBinId(
  category: string,
  subLocation: HomeSubLocation,
): string {
  if (subLocation === 'Cooler') return 'Cooler'
  const prefix = subLocation === 'Lagringsskåp' ? 'Lgh' : 'Kall'
  return `${prefix} ${category}`
}
