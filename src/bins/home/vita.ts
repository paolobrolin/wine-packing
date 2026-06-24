import type { BinRule } from '../types'

export const homeVitaRule: BinRule = {
  id: 'home/vita',
  name: 'Vita viner',
  priority: 50,
  location: 'HOME',
  binId: '6. VITA',
  overflowBinId: null,
  match: (b) => {
    const wt = (b as { wineType?: string | null }).wineType ?? ''
    if (wt === 'Orange' || wt === 'White - Off-dry') return true
    return wt.startsWith('White') && !wt.includes('Sparkling') && !wt.includes('Sweet') && !wt.includes('Dessert') && !wt.includes('Fortified')
  },
}
