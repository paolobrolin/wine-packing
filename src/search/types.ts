import type { DbBottle } from '../data/models'

export type Scope = 'home-unsorted' | 'home-all' | 'everywhere'
export type Mode = 'packing' | 'unpacking'
export type Tier = 'needs-action' | 'in-progress' | 'no-move'

export interface ScoredBottle {
  bottle: DbBottle
  score: number
  tier: Tier
}

export interface TieredResults {
  needsAction: ScoredBottle[]
  inProgress: ScoredBottle[]
  noMove: ScoredBottle[]
  total: number
}

export interface SearchField {
  key: keyof DbBottle
  weight: number
  prefix: boolean
}

export const SEARCH_FIELDS: SearchField[] = [
  { key: 'producer', weight: 4, prefix: true },
  { key: 'wine', weight: 3, prefix: true },
  { key: 'vintage', weight: 5, prefix: false },
  { key: 'region', weight: 1, prefix: true },
  { key: 'country', weight: 1, prefix: true },
  { key: 'recommended_bin', weight: 1, prefix: true },
]
