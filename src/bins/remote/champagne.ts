import type { BinRule } from '../types'

const SPARKLING_KEYWORDS = ['Champagne', 'Crémant', 'Cremant', 'Franciacorta', 'Perlé', 'Perle', 'TrentoDOC', 'Cava']

export const champagneRule: BinRule = {
  id: 'remote/champagne',
  name: 'Champagne + Sparkling',
  priority: 40,
  location: 'REMOTE',
  binId: '2.5 CHAMPAGNE',
  overflowBinId: '2.6 FR OTHER',
  match: (b) => {
    if (b.region === 'Champagne') return true
    return SPARKLING_KEYWORDS.some((k) => b.wine.includes(k))
  },
}
