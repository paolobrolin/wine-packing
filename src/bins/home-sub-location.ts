import type { Bottle } from '../rules/types'

export type HomeSubLocation = 'Lagringsskåp' | 'Källaren' | 'Cooler'

const LGH_PER_CATEGORY = 31

export function determineHomeSubLocation(
  bottle: Bottle,
  currentYear: number,
  lghCategoryCount?: number,
): HomeSubLocation {
  const end = bottle.endConsume
  const cost = bottle.cost ?? 0

  if (end != null && end < currentYear && cost >= 500) {
    return 'Cooler'
  }

  const lghFull = (lghCategoryCount ?? 0) >= LGH_PER_CATEGORY
  return lghFull ? 'Källaren' : 'Lagringsskåp'
}

export function buildHomeBinId(
  category: string,
  subLocation: HomeSubLocation,
): string {
  if (subLocation === 'Cooler') return 'Cooler'
  const prefix = subLocation === 'Lagringsskåp' ? 'Lgh' : 'Kall'
  return `${prefix} ${category}`
}
