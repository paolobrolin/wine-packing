import type { BinRule } from '../types'

export const siciliaRule: BinRule = {
  id: 'remote/sicilia',
  name: 'Sicilien',
  priority: 30,
  location: 'REMOTE',
  binId: '3.6 SICILIEN',
  overflowBinId: '3.8 OVERFLOW',
  match: (b) => b.country === 'Italy' && b.region === 'Sicily',
}
