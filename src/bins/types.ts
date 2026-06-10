import type { Bottle } from '../rules/types'

export type ResolvedLocation = 'REMOTE' | 'HOME'

export interface BinRule {
  id: string
  name: string
  priority: number
  location: ResolvedLocation
  binId: string
  overflowBinId: string | null
  match: (bottle: Bottle) => boolean
}

export interface BinResolverContext {
  currentYear: number
  capacity: CapacityTracker
  allBottles: Bottle[]
  owcGroups: Map<string, Bottle[]>
  owcAssignments: Map<string, string>
}

export interface BinResolution {
  binId: string
  binRuleId: string
  overflowed: boolean
}

export interface CapacityTracker {
  hasRoom(binId: string, n?: number): boolean
  reserve(binId: string, n?: number): boolean
  remaining(binId: string): number
  snapshot(): Map<string, { current: number; max: number }>
}
