import type { BinRule } from '../types'

export const spCastillaRule: BinRule = {
  id: 'remote/sp-castilla',
  name: 'Spanien Castilla y León',
  priority: 30,
  location: 'REMOTE',
  binId: '1.8 CASTILLA',
  overflowBinId: '1.7 NW + SP OTHER',
  match: (b) => b.country === 'Spain' && b.region.includes('Castilla'),
}
