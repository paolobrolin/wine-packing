import type { BinRule } from '../types'

export const colginRule: BinRule = {
  id: 'remote/colgin',
  name: 'Colgin',
  priority: 100,
  location: 'REMOTE',
  binId: '1.5 COLGIN',
  overflowBinId: '1.8 NEW WORLD OTHER',
  match: (b) => b.producer.includes('Colgin'),
}
