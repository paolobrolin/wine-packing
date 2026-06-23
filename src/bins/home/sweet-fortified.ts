import type { BinRule } from '../types'

export const homeSweetFortifiedRule: BinRule = {
  id: 'home/sweet-fortified',
  name: 'Söta + Starkvin',
  priority: 60,
  location: 'HOME',
  binId: '7. SOTA + STARKVIN',
  overflowBinId: null,
  match: (b) => {
    const wt = (b as { wineType?: string | null }).wineType ?? ''
    return wt.includes('Sweet') || wt.includes('Dessert') || wt.includes('Fortified')
  },
}
