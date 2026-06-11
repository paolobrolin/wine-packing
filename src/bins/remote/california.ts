import type { BinRule } from '../types'

export const californiaRule: BinRule = {
  id: 'remote/california',
  name: 'California Other',
  priority: 15,
  location: 'REMOTE',
  binId: '1.6 CALIFORNIA OTHER',
  overflowBinId: '1.7 NEW WORLD OTHER',
  match: (b) => b.country === 'USA',
}
