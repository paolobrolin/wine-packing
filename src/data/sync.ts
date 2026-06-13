import type { Bottle, RuleContext } from '../rules/types'
import type { DbBottle } from './models'
import type { ResolvedLocation } from '../bins/types'
import { defaultRules } from '../rules/criteria'
import { evaluatePlacement } from '../rules/evaluate'
import { resolveAllBins, resolveBin } from '../bins/resolve'
import { createCapacityTracker } from '../bins/capacity'
import { remoteBinRules } from '../bins/remote'
import { homeBinRules } from '../bins/home'
import { determineHomeSubLocation, buildHomeBinId } from '../bins/home-sub-location'

export interface CtBottle {
  barcode: string
  iwine: number
  size: string
  location: string | null
  bin: string | null
  bottle_cost: number | null
  bottle_cost_currency: string | null
  begin_consume: number | null
  end_consume: number | null
  bottle_note: string | null
  purchase_note: string | null
  extra: {
    Vintage: string | null
    Wine: string
    Producer: string
    Country: string
    Region: string
    Type: string | null
  }
}

export interface SyncResult {
  upserted: number
  deleted: number
  orphanedBarcodes: string[]
  alreadyAtDestination: number
  needsMove: number
  home: number
}

export function buildSyncRows(
  ctBottles: CtBottle[],
  existingByBarcode: Map<string, Pick<DbBottle, 'state' | 'packed_at' | 'in_transit_at' | 'shelved_at' | 'synced_at' | 'trip_id' | 'owc_group'>>,
  currentYear: number,
): { rows: Partial<DbBottle>[]; stats: SyncResult } {
  const bottles: Bottle[] = ctBottles.map(toRuleBottle)

  const verticals = buildVerticals(bottles)
  const owcGroups = buildOwcGroups(ctBottles, bottles)
  const context: RuleContext = {
    currentYear,
    binCapacities: new Map(),
    verticals,
    owcGroups,
  }

  let alreadyAtDestination = 0
  let needsMoveCount = 0
  let homeCount = 0
  const remoteAtDest = new Set<number>()

  // Pass 1: evaluate placement (location only)
  const placements = ctBottles.map((_ct, i) => {
    const bottle = bottles[i]
    const placement = evaluatePlacement(bottle, defaultRules, context)
    if (placement != null && bottle.currentLocation === placement.recommendedLocation) {
      alreadyAtDestination++
      remoteAtDest.add(i)
      return null
    }
    if (placement != null) {
      needsMoveCount++
      return placement
    }
    return null
  })

  // Pass 1.5: HOME placement — resolve bin for HOME bottles (skip REMOTE-at-dest)
  const homePlacements = bottles.map((bottle, i) => {
    if (placements[i] != null) return null
    if (remoteAtDest.has(i)) return null

    const sortedRules = [...homeBinRules].sort((a, b) => b.priority - a.priority)
    let categoryBinId: string | null = null
    let matchedRuleId: string | null = null
    for (const rule of sortedRules) {
      if (rule.match(bottle)) {
        categoryBinId = rule.binId
        matchedRuleId = rule.id
        break
      }
    }
    if (categoryBinId == null) { homeCount++; return null }

    const subLocation = determineHomeSubLocation(bottle, currentYear)
    const binId = buildHomeBinId(categoryBinId, subLocation)
    const currentNorm = bottle.currentLocation === 'REMOTE' ? 'REMOTE' : 'HOME'

    if (currentNorm === 'HOME' && bottle.currentBin === binId) {
      alreadyAtDestination++
    } else {
      homeCount++
    }

    return { recommendedLocation: 'HOME', recommendedBin: binId, reason: `home: ${subLocation}`, ruleId: matchedRuleId }
  })

  // Pass 2: resolve bins for bottles that need to move
  const binInput = bottles
    .map((bottle, i) => {
      const placement = placements[i]
      if (placement == null) return null
      return { bottle, location: placement.recommendedLocation as ResolvedLocation }
    })
    .filter((x): x is { bottle: Bottle; location: ResolvedLocation } => x != null)

  const binRules = [...remoteBinRules, ...homeBinRules]
  const binContext = {
    currentYear,
    capacity: createCapacityTracker(new Map()),
    allBottles: bottles,
    owcGroups,
    owcAssignments: new Map<string, string>(),
  }
  const binResolutions = resolveAllBins(binInput, binRules, binContext)

  // Pass 3: build rows
  const rows = ctBottles.map((ct, i) => {
    const bottle = bottles[i]
    const placement = placements[i]

    let recLoc: string | null = null
    let recBin: string | null = null
    let reason: string | null = null
    let ruleId: string | null = null

    if (placement != null) {
      recLoc = placement.recommendedLocation
      recBin = placement.recommendedBin
      reason = placement.reason
      ruleId = extractRuleId(placement.reason)

      const binRes = binResolutions.get(bottle.barcode)
      if (binRes != null) {
        recBin = binRes.binId
      }
    } else {
      const homePlacement = homePlacements[i]
      if (homePlacement != null) {
        recLoc = homePlacement.recommendedLocation
        recBin = homePlacement.recommendedBin
        reason = homePlacement.reason
        ruleId = homePlacement.ruleId
      }
    }

    const existing = existingByBarcode.get(ct.barcode)
    const preservedState = existing?.state ?? 'pending'
    let state: string = preservedState

    if (recLoc == null) {
      state = bottle.currentLocation != null ? 'synced' : 'pending'
    } else if (recLoc === 'HOME' && recBin != null && bottle.currentBin === recBin) {
      state = 'synced'
    }

    return {
      barcode: ct.barcode,
      iwine: ct.iwine,
      vintage: ct.extra.Vintage,
      wine: ct.extra.Wine,
      producer: ct.extra.Producer,
      country: ct.extra.Country,
      region: ct.extra.Region,
      size: ct.size,
      cost: ct.bottle_cost,
      cost_currency: ct.bottle_cost_currency ?? 'SEK',
      wine_type: ct.extra.Type ?? null,
      begin_consume: sanitizeDrinkWindow(ct.begin_consume),
      end_consume: sanitizeDrinkWindow(ct.end_consume),
      current_location: ct.location,
      current_bin: ct.bin,
      recommended_location: recLoc,
      recommended_bin: recBin,
      move_reason: reason,
      rule_id: ruleId,
      state: state as DbBottle['state'],
      packed_at: existing?.packed_at ?? null,
      in_transit_at: existing?.in_transit_at ?? null,
      shelved_at: existing?.shelved_at ?? null,
      synced_at: existing?.synced_at ?? null,
      trip_id: existing?.trip_id ?? null,
      owc_group: existing?.owc_group ?? null,
      ct_location_at_sync: ct.location,
      ct_bin_at_sync: ct.bin,
    } satisfies Partial<DbBottle>
  })

  const ctBarcodes = new Set(ctBottles.map((ct) => ct.barcode))
  const orphanedBarcodes = [...existingByBarcode.keys()].filter((bc) => !ctBarcodes.has(bc)).sort()

  return {
    rows,
    stats: {
      upserted: rows.length,
      deleted: orphanedBarcodes.length,
      orphanedBarcodes,
      alreadyAtDestination,
      needsMove: needsMoveCount,
      home: homeCount,
    },
  }
}

function sanitizeDrinkWindow(val: number | null): number | null {
  if (val == null || val === 9999) return null
  return val
}

function detectOwcGroup(ct: CtBottle): string | null {
  if (ct.bottle_note && ct.bottle_note.toUpperCase().includes('OWC')) {
    return ct.purchase_note ?? `${ct.extra.Wine}_${ct.extra.Vintage ?? 'NV'}`
  }
  return null
}

function toRuleBottle(ct: CtBottle): Bottle {
  return {
    barcode: ct.barcode,
    iwine: ct.iwine,
    vintage: ct.extra.Vintage,
    wine: ct.extra.Wine ?? '',
    producer: ct.extra.Producer ?? '',
    country: ct.extra.Country ?? '',
    region: ct.extra.Region ?? '',
    size: ct.size ?? '750ml',
    cost: ct.bottle_cost,
    beginConsume: sanitizeDrinkWindow(ct.begin_consume),
    endConsume: sanitizeDrinkWindow(ct.end_consume),
    currentLocation: ct.location,
    currentBin: ct.bin,
    owcGroup: detectOwcGroup(ct),
    wineType: ct.extra.Type ?? null,
  }
}

function buildVerticals(bottles: Bottle[]): Map<string, Bottle[]> {
  const groups = new Map<string, Bottle[]>()
  for (const b of bottles) {
    const key = `${b.producer}|${normalizeVerticalName(b.wine)}`
    const list = groups.get(key) ?? []
    list.push(b)
    groups.set(key, list)
  }
  for (const [key, list] of groups) {
    const vintages = new Set(list.map((b) => b.vintage))
    if (vintages.size <= 1) groups.delete(key)
  }
  return groups
}

function buildOwcGroups(ctBottles: CtBottle[], bottles: Bottle[]): Map<string, Bottle[]> {
  const groups = new Map<string, Bottle[]>()
  for (let i = 0; i < ctBottles.length; i++) {
    const ct = ctBottles[i]
    if (ct.bottle_note && ct.bottle_note.toUpperCase().includes('OWC')) {
      const key = ct.purchase_note ?? `${ct.extra.Wine}_${ct.extra.Vintage ?? 'NV'}`
      const list = groups.get(key) ?? []
      list.push(bottles[i])
      groups.set(key, list)
    }
  }
  return groups
}

function normalizeVerticalName(wine: string): string {
  return wine.replace(/\s+No[~.]?\s*\d+/g, '').replace(/\s+(I{1,3}|IV|V)$/, '').trim()
}

function extractRuleId(reason: string): string | null {
  if (reason.startsWith('OWC')) return 'owc'
  if (reason.startsWith('vertical')) return 'vertical'
  if (reason.startsWith('not drinkable')) return 'not-yet-drinkable'
  if (reason.startsWith('midpoint')) return 'midpoint'
  if (reason.includes('SQN white')) return 'sqn-whites'
  return null
}
