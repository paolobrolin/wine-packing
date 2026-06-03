import type { Rule, Bottle } from '../types'

const SQN_WHITE_PATTERNS = ['Tectumque', 'Distenta White', 'Entre Chien']

function isSqnWhite(bottle: Bottle): boolean {
  if (!bottle.producer.includes('Sine Qua Non')) return false
  return SQN_WHITE_PATTERNS.some((p) => bottle.wine.includes(p))
}

export const sqnWhitesRule: Rule = {
  id: 'sqn-whites',
  name: 'SQN Whites Stay Home',
  priority: 40,

  evaluate(bottle) {
    if (!isSqnWhite(bottle)) return null
    return {
      recommendedLocation: 'HOME',
      recommendedBin: null,
      reason: 'SQN white — always home',
    }
  },
}
