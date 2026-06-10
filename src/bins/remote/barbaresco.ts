import type { BinRule } from '../types'

export const barbarescoRule: BinRule = {
  id: 'remote/barbaresco',
  name: 'Barbaresco',
  priority: 60,
  location: 'REMOTE',
  binId: '3.4 BARBARESCO',
  overflowBinId: '3.8 OVERFLOW',
  match: (b) => b.country === 'Italy' && b.region === 'Piedmont' && b.wine.includes('Barbaresco'),
}
