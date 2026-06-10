import type { BinRule } from '../types'

const PRODUCERS = ['Spottswoode', 'Hirsch', 'Ridge']

export const spotsGroupRule: BinRule = {
  id: 'remote/spots-group',
  name: 'Spottswoode + Hirsch + Ridge',
  priority: 90,
  location: 'REMOTE',
  binId: '1.7 SPOTS + HIRSCH + RIDGE',
  overflowBinId: '1.8 NEW WORLD OTHER',
  match: (b) => PRODUCERS.some((p) => b.producer.includes(p)),
}
