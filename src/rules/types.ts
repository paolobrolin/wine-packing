export interface Bottle {
  barcode: string
  iwine: number
  vintage: string | null
  wine: string
  producer: string
  country: string
  region: string
  // CT SubRegion, e.g. 'Médoc', 'Libournais'. Optional: only some rules use it.
  subRegion?: string | null
  // CT Appellation, e.g. 'Barolo', 'Ribera del Duero'. Optional like subRegion.
  appellation?: string | null
  // CT bottle note (OWC markings such as 'OWC 1x1' for single boxes).
  bottleNote?: string | null
  size: string
  cost: number | null
  // Currency of cost (CT's BottleCostCurrency); missing means SEK.
  costCurrency?: string | null
  // CT's market value (Valuation) in SEK per 750 ml; missing when CT has none.
  marketValue?: number | null
  // The highest value750 among all bottles of this wine (any vintage, any size).
  wineValue?: number | null
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
