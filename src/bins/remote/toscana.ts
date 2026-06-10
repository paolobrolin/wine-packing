import type { BinRule } from '../types'

export const toscanaRule: BinRule = {
  id: 'remote/toscana',
  name: 'Toscana',
  priority: 30,
  location: 'REMOTE',
  binId: '3.5 TOSCANA',
  overflowBinId: '3.8 OVERFLOW',
  match: (b) => b.country === 'Italy' && b.region === 'Tuscany',
}
