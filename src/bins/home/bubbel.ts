import type { BinRule } from '../types'

const SPARKLING_REGIONS = ['Champagne']
const SPARKLING_KEYWORDS = ['Champagne', 'Crémant', 'Cremant', 'Cava', 'Prosecco', 'Franciacorta', 'TrentoDOC', 'Brut', 'Pétillant']

export const homeBubbelRule: BinRule = {
  id: 'home/bubbel',
  name: 'Bubbel',
  priority: 50,
  location: 'HOME',
  binId: '5. BUBBEL',
  overflowBinId: null,
  match: (b) => {
    if (SPARKLING_REGIONS.includes(b.region)) return true
    return SPARKLING_KEYWORDS.some((k) => b.wine.includes(k))
  },
}
