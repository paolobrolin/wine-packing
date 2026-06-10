import type { BinRule } from '../types'

const REGIONS = ['Castilla y León', 'La Rioja', 'Rioja']

export const spMainRule: BinRule = {
  id: 'remote/sp-main',
  name: 'Spanien Castilla + Rioja',
  priority: 30,
  location: 'REMOTE',
  binId: '3.7 SPANIEN',
  overflowBinId: '3.8 OVERFLOW',
  match: (b) => b.country === 'Spain' && REGIONS.some((r) => b.region.includes(r)),
}
