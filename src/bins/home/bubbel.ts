import type { BinRule } from '../types'

export const homeBubbelRule: BinRule = {
  id: 'home/bubbel',
  name: 'Bubbel',
  priority: 50,
  location: 'HOME',
  binId: '5. BUBBEL',
  overflowBinId: null,
  match: (b) => {
    const wt = (b as { wineType?: string | null }).wineType ?? ''
    return wt.includes('Sparkling')
  },
}
