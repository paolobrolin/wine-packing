import type { BinRule } from '../types'

const REGIONS = ['Mosel', 'Saar', 'Ruwer', 'Nahe']

export const deMoselRule: BinRule = {
  id: 'remote/de-mosel',
  name: 'Mosel + Nahe',
  priority: 50,
  location: 'REMOTE',
  binId: '2.7 DE MOSEL',
  overflowBinId: '2.8 DE OTHER',
  match: (b) => b.country === 'Germany' && REGIONS.some((r) => b.region.includes(r)),
}
