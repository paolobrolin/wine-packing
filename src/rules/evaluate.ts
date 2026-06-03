import type { Bottle, Rule, RuleContext, PlacementResult } from './types'

export function evaluatePlacement(
  bottle: Bottle,
  rules: Rule[],
  context: RuleContext,
): PlacementResult | null {
  const sorted = [...rules].sort((a, b) => b.priority - a.priority)

  for (const rule of sorted) {
    const result = rule.evaluate(bottle, context)
    if (result != null) return result
  }

  return null
}
