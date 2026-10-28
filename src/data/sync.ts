import type { Bottle, RuleContext } from '../rules/types'
import type { DbBottle } from './models'
import type { ResolvedLocation } from '../bins/types'
import { defaultRules } from '../rules/criteria'
import { evaluatePlacement } from '../rules/evaluate'
import { resolveAllBins } from '../bins/resolve'
import { createCapacityTracker } from '../bins/capacity'
import { remoteBinRules } from '../bins/remote'
import { CABINET, CELLAR_SHELVES, HOME_MARGIN, homeCategory, isOnCabinetShelf, placesFor, type HomeCategory } from '../bins/home/layout'
import { determineHomeSubLocation } from '../bins/home-sub-location'
import { isRemoteBin } from '../bins/all-bins'

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
    SubRegion?: string | null
    Appellation?: string | null
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

export type ExistingSyncRow = Pick<DbBottle, 'state' | 'packed_at' | 'in_transit_at' | 'shelved_at' | 'synced_at' | 'trip_id' | 'owc_group' | 'estimated_value' | 'value_source' | 'label_ref'>
  & Partial<Pick<DbBottle, 'current_location' | 'current_bin' | 'ct_location_at_sync' | 'ct_bin_at_sync' | 'recommended_location' | 'recommended_bin'>>

// A bottle placed in the app (shelved or done) whose new position CT does not
// have yet. Until CT changes, the app's position is the true one; once CT
// changes in any way, CT wins again. Packed and in-transit bottles are left
// out: their current_bin is the destination, not where they physically are.
function appPositionPendingInCt(ct: CtBottle, existing: ExistingSyncRow | undefined): { location: string | null; bin: string | null } | null {
  if (existing == null) return null
  if (existing.state !== 'synced' && existing.state !== 'shelved') return null
  if (existing.ct_location_at_sync === undefined || existing.ct_bin_at_sync === undefined) return null
  const same = (a: string | null | undefined, b: string | null | undefined) => (a || null) === (b || null)
  const ctUnchanged = same(ct.location, existing.ct_location_at_sync) && same(ct.bin, existing.ct_bin_at_sync)
  const appMoved = !same(existing.current_location, existing.ct_location_at_sync) || !same(existing.current_bin, existing.ct_bin_at_sync)
  if (!ctUnchanged || !appMoved) return null
  // A Done without a bin writes '': that is not a placement.
  const bin = existing.current_bin || null
  if (bin == null) return null
  return { location: locationForBin(bin, existing.current_location ?? null), bin }
}

const KEEP_LOCATIONS = new Set(['Ekholmen', 'Lugnet', 'Lotten i CA', 'GSN | Wine Storage'])

function isKeepPosition(location: string | null | undefined, bin: string | null | undefined): boolean {
  return (location != null && KEEP_LOCATIONS.has(location)) || (bin != null && KEEP_LOCATIONS.has(bin))
}

function recommendationChanged(existing: ExistingSyncRow | undefined, recLoc: string, recBin: string | null, bottle: Bottle): boolean {
  if (existing == null || existing.recommended_location === undefined || existing.recommended_bin === undefined) return false
  if (existing.recommended_location == null) {
    // Stored null means "already at its destination" at the last sync, not an
    // older recommendation. Only a change of location counts then: a REMOTE
    // bottle the rules now want HOME reopens; one taken home by hand while the
    // rules still say REMOTE stays done.
    if (existing.ct_location_at_sync === undefined) return false
    // At a keep place the null means "outside the rules": leaving it is a change.
    if (isKeepPosition(existing.ct_location_at_sync, existing.ct_bin_at_sync)) return true
    const lastLocation = existing.ct_location_at_sync === 'REMOTE' ? 'REMOTE' : 'HOME'
    // Still at REMOTE, which now has shelf rules: a bottle on another shelf
    // than its rule's is a move within REMOTE (e.g. a new shelf layout).
    if (lastLocation === 'REMOTE' && recLoc === 'REMOTE') {
      return bottle.currentLocation === 'REMOTE' && recBin != null && bottle.currentBin !== recBin
    }
    return lastLocation !== recLoc
  }
  return existing.recommended_location !== recLoc || (existing.recommended_bin ?? null) !== recBin
}

// The app only ever writes current_bin, so a cross-location shelve leaves the
// old location behind. The bin says where the bottle is: a remote bin means
// REMOTE; any other bin cannot be at REMOTE, so a stale REMOTE becomes home.
// (Generated home bins such as 'Kall 6. VITA' are not all in HOME_BINS, so the
// home side is defined as "not remote" rather than by that list.)
function locationForBin(bin: string, location: string | null): string | null {
  if (isRemoteBin(bin)) return 'REMOTE'
  return location === 'REMOTE' || location == null ? 'Cellar' : location
}

export function buildSyncRows(
  ctBottles: CtBottle[],
  existingByBarcode: Map<string, ExistingSyncRow>,
  currentYear: number,
  costOverrides?: Map<number, number>,
  /** iwine → CT bottle image ref, from the wine_labels table. */
  labelRefs?: Map<number, string>,
): { rows: Partial<DbBottle>[]; stats: SyncResult } {
  const valuations = new Map<string, { value: number; source: string }>()
  for (const ct of ctBottles) {
    if ((ct.bottle_cost ?? 0) !== 0) continue
    const override = costOverrides?.get(ct.iwine)
    const existing = existingByBarcode.get(ct.barcode)
    if (override != null) {
      valuations.set(ct.barcode, { value: override, source: 'ct_auction' })
    } else if (existing?.estimated_value != null) {
      valuations.set(ct.barcode, { value: existing.estimated_value as number, source: (existing.value_source as string) ?? 'unknown' })
    }
  }

  const appPositions = ctBottles.map(ct => appPositionPendingInCt(ct, existingByBarcode.get(ct.barcode)))

  // The rules see the effective position, so a bottle placed in the app is
  // judged where it actually is, not where CT still thinks it is.
  const bottles: Bottle[] = ctBottles.map((ct, i) => {
    const valuation = valuations.get(ct.barcode)
    const effectiveCost = (ct.bottle_cost ?? 0) !== 0 ? ct.bottle_cost : valuation?.value ?? null
    const pos = appPositions[i]
    return toRuleBottle({ ...ct, bottle_cost: effectiveCost, ...(pos ?? {}) })
  })

  const verticals = buildVerticals(bottles)
  const owcGroups = buildOwcGroups(ctBottles, bottles)
  const context: RuleContext = {
    currentYear,
    binCapacities: new Map(),
    verticals,
    owcGroups,
  }

  // Bottles parked at these places stay put: they are deliberate placements,
  // not candidates for the placement rules. CT encodes most of them in the
  // Location field, but Lugnet lives in Bin (location stays "Cellar"), so both
  // fields have to be checked.
  const isKeepPlace = (bottle: Bottle): boolean => isKeepPosition(bottle.currentLocation, bottle.currentBin)

  // Excluded from BOTH passes. Pass 1 alone is not enough: Pass 1.5 picks up
  // every bottle with a null placement and hands it a home bin, which is how
  // Ekholmen bottles kept reappearing after being cleared by hand.
  const keepIndices = new Set(bottles.flatMap((b, i) => (isKeepPlace(b) ? [i] : [])))

  const remoteAtDest = new Set<number>()

  // Pass 1: evaluate placement (location only)
  const placements = ctBottles.map((_ct, i) => {
    const bottle = bottles[i]
    if (keepIndices.has(i)) {
      return null
    }
    const placement = evaluatePlacement(bottle, defaultRules, context)
    if (placement != null && bottle.currentLocation === placement.recommendedLocation) {
      remoteAtDest.add(i)
      return null
    }
    if (placement != null) {
      return placement
    }
    return null
  })

  // Pass 1.5: HOME placement (see src/bins/home/layout.ts). Per category:
  // bottles already on the cabinet shelf keep their place, the rest fill it
  // by earliest drinking window up to capacity minus the margin, then the
  // category's Källaren shelves; what is left goes to REMOTE, latest first.
  const homeIndices = bottles
    .map((_, i) => i)
    .filter((i) => {
      if (keepIndices.has(i)) return false
      if (remoteAtDest.has(i)) return false
      if (placements[i] == null) return true
      const p = placements[i]!
      return p.recommendedLocation === 'HOME' && p.recommendedBin == null
    })

  const homePlacements: ({ recommendedLocation: string; recommendedBin: string; reason: string; ruleId: string | null } | null)[] = new Array(bottles.length).fill(null)
  const homeOverflow = new Set<number>()
  // An unknown window is not a late one: rank it as a few years out.
  const windowKey = (i: number) => bottles[i].endConsume ?? currentYear + 5
  const byCategory = new Map<HomeCategory, number[]>()

  for (const i of homeIndices) {
    const bottle = bottles[i]
    if (determineHomeSubLocation(bottle, currentYear) === 'Cooler') {
      homePlacements[i] = { recommendedLocation: 'HOME', recommendedBin: 'Cooler', reason: 'home: Cooler', ruleId: 'home/cooler' }
      continue
    }
    const c = homeCategory(bottle)
    byCategory.set(c, [...(byCategory.get(c) ?? []), i])
  }

  const cellarUsed = new Map<string, number>()
  const cellarQueue: { i: number; c: HomeCategory }[] = []
  for (const [c, idx] of byCategory) {
    const shelf = CABINET[c]
    const placed = idx.filter((i) => isOnCabinetShelf(bottles[i].currentBin, c))
    const rest = idx.filter((i) => !isOnCabinetShelf(bottles[i].currentBin, c)).sort((x, y) => windowKey(x) - windowKey(y))
    let used = 0
    for (const i of [...placed, ...rest]) {
      const p = placesFor(bottles[i].size)
      if (placed.includes(i) || used + p <= shelf.capacity - HOME_MARGIN) {
        used += p
        homePlacements[i] = { recommendedLocation: 'HOME', recommendedBin: shelf.bin, reason: 'home: Lagringsskåp', ruleId: `home/${c.toLowerCase()}` }
      } else {
        cellarQueue.push({ i, c })
      }
    }
  }
  // Källaren: bottles already on one of their category's shelves keep it,
  // then the rest by earliest window. Leftovers go to REMOTE.
  const shelvesFor = (c: HomeCategory) => CELLAR_SHELVES.filter((s) => s.categories.includes(c))
  const onOwnShelf = ({ i, c }: { i: number; c: HomeCategory }) => shelvesFor(c).some((s) => s.bin === bottles[i].currentBin)
  const ordered = [...cellarQueue.filter(onOwnShelf), ...cellarQueue.filter((q) => !onOwnShelf(q)).sort((x, y) => windowKey(x.i) - windowKey(y.i))]
  for (const { i, c } of ordered) {
    const p = placesFor(bottles[i].size)
    const own = shelvesFor(c).find((s) => s.bin === bottles[i].currentBin)
    const target = own ?? shelvesFor(c).find((s) => (cellarUsed.get(s.bin) ?? 0) + p <= s.capacity - HOME_MARGIN)
    if (target == null) { homeOverflow.add(i); continue }
    cellarUsed.set(target.bin, (cellarUsed.get(target.bin) ?? 0) + p)
    homePlacements[i] = { recommendedLocation: 'HOME', recommendedBin: target.bin, reason: 'home: Källaren', ruleId: `home/${c.toLowerCase()}` }
  }

  // Pass 2: resolve bins for bottles that need to move
  const binInput = bottles
    .map((bottle, i) => {
      const placement = placements[i]
      // Bottles already at REMOTE still get a shelf: the REMOTE layout can
      // change, and a bottle on the wrong shelf is a move within REMOTE.
      if (placement == null || homeOverflow.has(i)) return remoteAtDest.has(i) || homeOverflow.has(i) ? { bottle, location: 'REMOTE' as ResolvedLocation } : null
      return { bottle, location: placement.recommendedLocation as ResolvedLocation }
    })
    .filter((x): x is { bottle: Bottle; location: ResolvedLocation } => x != null)

  const binRules = remoteBinRules
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

      if (recBin == null) {
        const binRes = binResolutions.get(bottle.barcode)
        if (binRes != null) {
          recBin = binRes.binId
        }
      }
    }

    if (placement == null && remoteAtDest.has(i)) {
      const binRes = binResolutions.get(bottle.barcode)
      recLoc = 'REMOTE'
      recBin = binRes?.binId ?? null
      reason = 'remote: at destination'
      ruleId = binRes?.binRuleId ?? null
    }

    if (homeOverflow.has(i)) {
      const binRes = binResolutions.get(bottle.barcode)
      recLoc = 'REMOTE'
      recBin = binRes?.binId ?? null
      reason = 'home full: REMOTE'
      ruleId = binRes?.binRuleId ?? null
    }

    const homePlacement = homePlacements[i]
    if (homePlacement != null) {
      recLoc = homePlacement.recommendedLocation
      recBin = homePlacement.recommendedBin
      reason = homePlacement.reason
      ruleId = homePlacement.ruleId
    }

    const existing = existingByBarcode.get(ct.barcode)
    const preservedState = existing?.state ?? 'pending'
    let state: string = preservedState

    if (recLoc == null) {
      state = bottle.currentLocation != null ? 'synced' : 'pending'
    } else if (preservedState !== 'packed' && preservedState !== 'in_transit' && recBin != null && bottle.currentBin === recBin && (recLoc === 'HOME' || bottle.currentLocation === 'REMOTE')) {
      // (A packed or in-transit bottle is in a box: CT's bin is where it came
      // from, so matching it says nothing about the move being done.)
      state = 'synced'
    } else if (preservedState === 'shelved' && appPositions[i] == null && !!existing?.current_bin && existing.current_bin === ct.bin) {
      // Shelved in the app on a shelf (possibly another than recommended, e.g.
      // the neighbour of a full one) and CT now has that shelf: done. No bin
      // on either side says nothing about where it is, so that is not done. As
      // 'synced' it can reopen later if the rules change.
      state = 'synced'
    } else if (preservedState === 'synced' && appPositions[i] == null && recommendationChanged(existing, recLoc, recBin, bottle)) {
      // Done against an older recommendation; the rules now want it elsewhere
      // (e.g. its drinking window changed). An unchanged recommendation means
      // the bottle was placed elsewhere on purpose, so that stays done. Not
      // while its app position is still waiting for CT: as pending it would
      // lose that position on the next sync; it reopens once CT has caught up.
      state = 'pending'
    }

    const holdRec = state === 'synced' && appPositions[i] != null
      && existing?.recommended_location !== undefined && existing?.recommended_bin !== undefined

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
      current_location: appPositions[i]?.location ?? ct.location,
      current_bin: appPositions[i] ? appPositions[i]!.bin : ct.bin,
      // While a done bottle's app position is waiting for CT, keep the stored
      // recommendation, so a change in the rules is still seen once CT has
      // caught up (otherwise it would be absorbed here and never reopen).
      recommended_location: holdRec ? existing!.recommended_location! : recLoc,
      recommended_bin: holdRec ? existing!.recommended_bin ?? null : recBin,
      move_reason: reason,
      rule_id: ruleId,
      state: state as DbBottle['state'],
      packed_at: existing?.packed_at ?? null,
      in_transit_at: existing?.in_transit_at ?? null,
      shelved_at: existing?.shelved_at ?? null,
      synced_at: existing?.synced_at ?? null,
      trip_id: existing?.trip_id ?? null,
      owc_group: existing?.owc_group ?? null,
      estimated_value: valuations.get(ct.barcode)?.value ?? existing?.estimated_value ?? null,
      label_ref: labelRefs?.get(ct.iwine) ?? existing?.label_ref ?? null,
      value_source: valuations.get(ct.barcode)?.source ?? existing?.value_source ?? null,
      ct_location_at_sync: ct.location,
      ct_bin_at_sync: ct.bin,
    } satisfies Partial<DbBottle>
  })

  const ctBarcodes = new Set(ctBottles.map((ct) => ct.barcode))
  const orphanedBarcodes = [...existingByBarcode.keys()].filter((bc) => !ctBarcodes.has(bc)).sort()

  // Counted once per bottle from the finished rows: in place, a move to (or
  // within) REMOTE, or a move at home.
  let alreadyAtDestination = 0
  let needsMoveCount = 0
  let homeCount = 0
  for (const r of rows) {
    const atLocation = r.recommended_location == null
      || (r.recommended_location === 'REMOTE') === (r.current_location === 'REMOTE')
    const inPlace = r.recommended_location == null || (atLocation && (r.recommended_bin == null || r.current_bin === r.recommended_bin))
    if (inPlace) alreadyAtDestination++
    else if (r.recommended_location === 'REMOTE') needsMoveCount++
    else homeCount++
  }

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
    subRegion: ct.extra.SubRegion ?? null,
    appellation: ct.extra.Appellation ?? null,
    bottleNote: ct.bottle_note,
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
