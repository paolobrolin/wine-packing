import type { BinRule } from '../types'

const WHITE_KEYWORDS = [
  'Blanc', 'Bianco', 'Blanco', 'White',
  'Chardonnay', 'Sauvignon Blanc', 'Riesling', 'Grüner', 'Gruner',
  'Pinot Grigio', 'Pinot Gris', 'Viognier', 'Marsanne', 'Roussanne',
  'Gewürztraminer', 'Gewurztraminer', 'Muscadet', 'Moscato',
  'Albariño', 'Albarino', 'Assyrtiko', 'Vermentino', 'Trebbiano',
  'Chablis', 'Meursault', 'Puligny', 'Chassagne',
  'Vin Jaune', 'Savagnin',
]

export const homeVitaRule: BinRule = {
  id: 'home/vita',
  name: 'Vita viner',
  priority: 50,
  location: 'HOME',
  binId: '6. VITA',
  overflowBinId: null,
  match: (b) => {
    const wt = (b as { wineType?: string | null }).wineType ?? ''
    if (wt.startsWith('White') && !wt.includes('Sparkling')) return true
    return WHITE_KEYWORDS.some((k) => b.wine.includes(k))
  },
}
