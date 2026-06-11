import type { BinRule } from '../types'

const REGIONS = ['Castilla y León', 'La Rioja', 'Rioja']

export const spMainRule: BinRule = {
  id: 'remote/sp-main',
  name: 'Spanien Castilla + Rioja',
  priority: 30,
  location: 'REMOTE',
  binId: '1.8 SPANIEN',
  overflowBinId: '1.7 NEW WORLD OTHER',
  match: (b) => b.country === 'Spain' && REGIONS.some((r) => b.region.includes(r)),
}
