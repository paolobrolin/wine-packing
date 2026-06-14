import type { Rule, Bottle } from '../types'

const KITCHEN_COST_THRESHOLD = 350

export const kitchenRule: Rule = {
  id: 'kitchen',
  name: 'Cheap Peak Wines — Kitchen',
  priority: 36,

  evaluate(bottle, context) {
    const end = bottle.endConsume
    if (end == null) return null
    if (end > context.currentYear + 1) return null
    const cost = bottle.cost ?? 0
    if (cost >= KITCHEN_COST_THRESHOLD) return null

    return {
      recommendedLocation: 'HOME',
      recommendedBin: null,
      reason: `kitchen: peak wine under ${KITCHEN_COST_THRESHOLD} kr`,
    }
  },
}
