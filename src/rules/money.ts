import type { Bottle } from './types'

// Rough rates, enough to place a bottle on the right side of a shelf threshold.
const SEK_PER: Record<string, number> = { SEK: 1, EUR: 11, USD: 10 }

/** CT's bottle cost in SEK (CT keeps it in the bottle's own currency). */
export function costSek(b: Pick<Bottle, 'cost' | 'costCurrency'>): number {
  return (b.cost ?? 0) * (SEK_PER[b.costCurrency ?? 'SEK'] ?? 1)
}

const ML: Record<string, number> = { '187ml': 187, '375ml': 375, '500ml': 500, '620ml': 620, '750ml': 750, '1.5L': 1500, '3.0L': 3000 }

/**
 * What one 750 ml of this bottle is worth in SEK: CT's market value
 * (already per 750 ml), else the purchase price scaled to 750 ml.
 */
export function value750(b: Pick<Bottle, 'cost' | 'costCurrency' | 'size' | 'marketValue'>): number {
  if ((b.marketValue ?? 0) > 0) return b.marketValue as number
  return costSek(b) * 750 / (ML[b.size] ?? 750)
}
