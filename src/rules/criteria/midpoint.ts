import type { Rule, Bottle, RuleContext } from '../types'

function calcMidpoint(bottle: Bottle, currentYear: number): number | null {
  const begin = bottle.beginConsume ?? (bottle.endConsume != null ? Math.min(currentYear, bottle.endConsume) : null)
  const end = bottle.endConsume ?? (bottle.beginConsume != null ? bottle.beginConsume + 10 : null)

  if (begin == null && end == null) return null
  if (begin != null && end != null) return (begin + end) / 2
  if (begin != null) return begin + 5
  return null
}

export const midpointRule: Rule = {
  id: 'midpoint',
  name: 'Drink Window Midpoint',
  priority: 10,

  evaluate(bottle: Bottle, context: RuleContext) {
    const midpoint = calcMidpoint(bottle, context.currentYear)
    if (midpoint == null) return null

    const threshold = context.currentYear + 4
    if (midpoint >= threshold) {
      return {
        recommendedLocation: 'REMOTE',
        recommendedBin: null,
        reason: `midpoint ${midpoint} (${Math.round(midpoint - context.currentYear)}y away)`,
      }
    }
    return null
  },
}
