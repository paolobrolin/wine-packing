import type { BinRule } from '../types'

export const champagneRule: BinRule = {
  id: 'remote/champagne',
  name: 'Champagne',
  priority: 40,
  location: 'REMOTE',
  binId: '2.5 CHAMPAGNE',
  overflowBinId: '2.6 FR OTHER',
  match: (b) => b.country === 'France' && (b.region === 'Champagne' || b.wine.includes('Champagne')),
}
