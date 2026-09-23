import type { Rule } from '../types'

const KITCHEN_COST_THRESHOLD = 350

export const kitchenRule: Rule = {
  id: 'kitchen',
  name: 'Cheap Peak Wines — Kitchen',
  priority: 36,

  evaluate(bottle, context) {
    const end = bottle.endConsume
    if (end == null) return null
    if (end > context.currentYear + 2) return null
    // Okänt värde är inte samma sak som billigt. Synken sätter cost=null när
    // CT-priset är 0 och inget estimated_value kunnat hämtas (gåvoviner,
    // auktionsposter utan pris) — utan den här spärren läses en gratis flaska
    // som den billigaste möjliga och hamnar i köket. Vinet ska hit bara när
    // ett lågt värde är positivt känt.
    const cost = bottle.cost
    if (cost == null || cost === 0) return null
    if (cost >= KITCHEN_COST_THRESHOLD) return null

    return {
      recommendedLocation: 'HOME',
      recommendedBin: 'Köket',
      reason: `kitchen: peak wine under ${KITCHEN_COST_THRESHOLD} kr`,
    }
  },
}
