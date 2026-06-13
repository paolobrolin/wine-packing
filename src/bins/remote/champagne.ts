import type { BinRule } from '../types'

export const champagneRule: BinRule = {
  id: 'remote/champagne',
  name: 'Champagne + Sparkling',
  priority: 40,
  location: 'REMOTE',
  binId: '2.5 CHAMPAGNE',
  overflowBinId: '2.6 FR OTHER',
  match: (b) => {
    if (b.region === 'Champagne') return true
    return (b.wineType ?? '').includes('Sparkling')
  },
}
