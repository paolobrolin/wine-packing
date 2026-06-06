import type { Rule, Bottle } from '../types'

export const notYetDrinkableRule: Rule = {
  id: 'not-yet-drinkable',
  name: 'Not Yet Drinkable',
  priority: 15,

  evaluate(bottle: Bottle, context) {
    if (bottle.beginConsume == null) return null
    if (bottle.beginConsume > context.currentYear + 3) {
      return {
        recommendedLocation: 'REMOTE',
        recommendedBin: null,
        reason: `not drinkable until ${bottle.beginConsume} (${bottle.beginConsume - context.currentYear}y away)`,
      }
    }
    return null
  },
}
