import type { Bottle } from '../rules/types'
import type { BinRule, BinResolution, BinResolverContext, ResolvedLocation } from './types'

export function resolveBin(
  bottle: Bottle,
  location: ResolvedLocation,
  rules: BinRule[],
  context: BinResolverContext,
): BinResolution | null {
  if (bottle.owcGroup != null) {
    const existing = context.owcAssignments.get(bottle.owcGroup)
    if (existing != null) {
      context.capacity.reserve(existing)
      return { binId: existing, binRuleId: 'owc-consistency', overflowed: false }
    }
  }

  const applicable = rules
    .filter((r) => r.location === location)
    .sort((a, b) => b.priority - a.priority)

  for (const rule of applicable) {
    if (!rule.match(bottle)) continue

    if (context.capacity.hasRoom(rule.binId)) {
      return commit(rule.binId, rule.id, false, bottle, context)
    }

    if (rule.overflowBinId != null && context.capacity.hasRoom(rule.overflowBinId)) {
      return commit(rule.overflowBinId, rule.id, true, bottle, context)
    }
  }

  return null
}

function commit(
  binId: string,
  ruleId: string,
  overflowed: boolean,
  bottle: Bottle,
  context: BinResolverContext,
): BinResolution {
  context.capacity.reserve(binId)
  if (bottle.owcGroup != null) {
    context.owcAssignments.set(bottle.owcGroup, binId)
  }
  return { binId, binRuleId: ruleId, overflowed }
}

export function resolveAllBins(
  bottles: Array<{ bottle: Bottle; location: ResolvedLocation }>,
  rules: BinRule[],
  context: BinResolverContext,
): Map<string, BinResolution> {
  const results = new Map<string, BinResolution>()

  const sorted = [...bottles].sort((a, b) => {
    const aOwc = a.bottle.owcGroup != null ? 0 : 1
    const bOwc = b.bottle.owcGroup != null ? 0 : 1
    if (aOwc !== bOwc) return aOwc - bOwc
    return a.bottle.barcode.localeCompare(b.bottle.barcode)
  })

  for (const { bottle, location } of sorted) {
    const resolution = resolveBin(bottle, location, rules, context)
    if (resolution != null) {
      results.set(bottle.barcode, resolution)
    }
  }

  return results
}
