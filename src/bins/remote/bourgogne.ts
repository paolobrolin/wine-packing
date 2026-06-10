import type { BinRule } from '../types'

const REGIONS = ['Burgundy', 'Bourgogne', 'Loire', 'Jura']

export const bourgogneRule: BinRule = {
  id: 'remote/bourgogne',
  name: 'Bourgogne + Loire + Jura',
  priority: 50,
  location: 'REMOTE',
  binId: '2.6 FR OTHER',
  overflowBinId: null,
  match: (b) => b.country === 'France' && REGIONS.some((r) => b.region.includes(r)),
}
