import type { Rule, Bottle } from '../types'

const SWEET_KEYWORDS = [
  'Sauternes', 'Barsac', 'Auslese', 'Beerenauslese', 'Trockenbeerenauslese',
  'Eiswein', 'Recioto', 'Vin Santo', 'Moscato',
]

function isSweetWine(bottle: Bottle): boolean {
  return SWEET_KEYWORDS.some((k) => bottle.wine.includes(k) || bottle.region.includes(k))
}

export const sweetWinesRule: Rule = {
  id: 'sweet-wines',
  name: 'Sweet Wines Stay Home',
  priority: 35,

  evaluate(bottle) {
    if (!isSweetWine(bottle)) return null
    return {
      recommendedLocation: 'HOME',
      recommendedBin: null,
      reason: 'sweet wine — stays home',
    }
  },
}
