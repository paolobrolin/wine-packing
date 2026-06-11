import type { BinRule } from '../types'

const NAPA_PRODUCERS = ['Colgin', 'Kongsgaard', 'Spottswoode', 'BOND']

export const napaRule: BinRule = {
  id: 'remote/napa',
  name: 'Napa Premium',
  priority: 90,
  location: 'REMOTE',
  binId: '1.5 NAPA',
  overflowBinId: '1.6 CALIFORNIA OTHER',
  match: (b) => b.country === 'USA' && NAPA_PRODUCERS.some((p) => b.producer.includes(p)),
}
