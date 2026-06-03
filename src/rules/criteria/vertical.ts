import type { Rule, Bottle, RuleContext } from '../types'

function midpoint(bottle: Bottle, currentYear: number): number | null {
  const begin = bottle.beginConsume ?? (bottle.endConsume != null ? Math.min(currentYear, bottle.endConsume) : null)
  const end = bottle.endConsume ?? (bottle.beginConsume != null ? bottle.beginConsume + 10 : null)
  if (begin != null && end != null) return (begin + end) / 2
  if (begin != null) return begin + 5
  return null
}

function shouldBeExternal(bottle: Bottle, currentYear: number): boolean {
  const mp = midpoint(bottle, currentYear)
  return mp != null && mp >= currentYear + 4
}

export const verticalRule: Rule = {
  id: 'vertical',
  name: 'Vertical Consistency',
  priority: 20,

  evaluate(bottle: Bottle, context: RuleContext) {
    const verticalKey = findVerticalKey(bottle, context.verticals)
    if (verticalKey == null) return null

    const siblings = context.verticals.get(verticalKey)!
    const sorted = [...siblings].sort((a, b) => (a.vintage ?? '').localeCompare(b.vintage ?? ''))

    const firstExtIdx = sorted.findIndex((b) => shouldBeExternal(b, context.currentYear))
    if (firstExtIdx === -1) return null

    const bottleIdx = sorted.findIndex((b) => b.barcode === bottle.barcode)
    if (bottleIdx < firstExtIdx) return null
    if (shouldBeExternal(bottle, context.currentYear)) return null

    return {
      recommendedLocation: 'REMOTE',
      recommendedBin: null,
      reason: `vertical consistency — follows ${sorted[firstExtIdx].vintage} ${sorted[firstExtIdx].wine}`,
    }
  },
}

function findVerticalKey(bottle: Bottle, verticals: Map<string, Bottle[]>): string | null {
  for (const [key, bottles] of verticals) {
    if (bottles.some((b) => b.barcode === bottle.barcode)) return key
  }
  return null
}
