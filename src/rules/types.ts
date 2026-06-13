export interface Bottle {
  barcode: string
  iwine: number
  vintage: string | null
  wine: string
  producer: string
  country: string
  region: string
  size: string
  cost: number | null
  beginConsume: number | null
  endConsume: number | null
  currentLocation: string | null
  currentBin: string | null
  owcGroup: string | null
  wineType: string | null
}

export interface PlacementResult {
  recommendedLocation: string
  recommendedBin: string | null
  reason: string
}

export interface BinCapacity {
  current: number
  max: number
}

export interface RuleContext {
  currentYear: number
  binCapacities: Map<string, BinCapacity>
  verticals: Map<string, Bottle[]>
  owcGroups: Map<string, Bottle[]>
}

export interface Rule {
  id: string
  name: string
  priority: number
  evaluate: (bottle: Bottle, context: RuleContext) => PlacementResult | null
}
