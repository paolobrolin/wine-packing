import type { Rule, Bottle } from '../types'

function isSweetWine(bottle: Bottle): boolean {
  const t = bottle.wineType ?? ''
  return t.includes('Sweet') || t.includes('Dessert')
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
