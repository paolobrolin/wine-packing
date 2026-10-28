import type { BinRule } from '../types'
import type { Bottle } from '../../rules/types'

// Banks follow CT's SubRegion, so any château lands on the right shelf
// without a producer list to maintain. Graves sits with the Médoc.
const LEFT_BANK_SUBREGIONS = ['Médoc', 'Graves']
const RIGHT_BANK_SUBREGIONS = ['Libournais']

function isBordeauxOnBank(b: Bottle, subRegions: string[]): boolean {
  if (b.country !== 'France' || !b.region.includes('Bordeaux')) return false
  // Sweet wines (Sauternes, Barsac, …) are not shelved with the reds.
  if (b.wineType?.includes('Sweet')) return false
  return subRegions.includes(b.subRegion ?? '')
}

export const bdxRbRule: BinRule = {
  id: 'remote/bdx-rb',
  name: 'Bordeaux Right Bank',
  priority: 50,
  location: 'REMOTE',
  binId: '2.2 BDX RB',
  overflowBinId: '2.6 FR OTHER',
  match: (b) => isBordeauxOnBank(b, RIGHT_BANK_SUBREGIONS),
}

export const bdxLbRule: BinRule = {
  id: 'remote/bdx-lb',
  name: 'Bordeaux Left Bank',
  priority: 50,
  location: 'REMOTE',
  binId: '2.1 BDX LB',
  overflowBinId: '2.6 FR OTHER',
  match: (b) => isBordeauxOnBank(b, LEFT_BANK_SUBREGIONS),
}
