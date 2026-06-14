import type { BinRule } from '../types'

const SWEET_FORTIFIED_TYPES = ['Sweet', 'Dessert', 'Fortified']
const SWEET_KEYWORDS = ['Moscato', 'Recioto', 'Vin Santo', 'Sherry', 'Jerez', 'Amontillado', 'Fino', 'Manzanilla', 'Oloroso', 'Palo Cortado', 'Porto', 'Port', 'Maury', 'Banyuls', 'Rivesaltes', 'Sauternes', 'Barsac', 'Auslese', 'Beerenauslese', 'Trockenbeerenauslese', 'Eiswein']

export const homeSweetFortifiedRule: BinRule = {
  id: 'home/sweet-fortified',
  name: 'Söta + Starkvin',
  priority: 60,
  location: 'HOME',
  binId: '7. SOTA + STARKVIN',
  overflowBinId: null,
  match: (b) => {
    const wt = (b as { wineType?: string | null }).wineType ?? ''
    if (SWEET_FORTIFIED_TYPES.some((t) => wt.includes(t))) return true
    return SWEET_KEYWORDS.some((k) => b.wine.includes(k))
  },
}
