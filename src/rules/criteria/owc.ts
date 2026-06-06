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
  return mp != null && mp >= currentYear + 3
}

export const owcRule: Rule = {
  id: 'owc',
  name: 'OWC Physical Unit',
  priority: 30,

  evaluate(bottle: Bottle, context: RuleContext) {
    if (bottle.owcGroup == null) return null
    if (shouldBeExternal(bottle, context.currentYear)) return null

    const siblings = context.owcGroups.get(bottle.owcGroup)
    if (siblings == null) return null

    const anySiblingExternal = siblings.some((b) =>
      b.barcode !== bottle.barcode && shouldBeExternal(b, context.currentYear),
    )

    if (!anySiblingExternal) return null

    return {
      recommendedLocation: 'REMOTE',
      recommendedBin: null,
      reason: `OWC physical unit — follows group "${bottle.owcGroup}"`,
    }
  },
}
