import type { BinRule } from '../types'

export const owcRule: BinRule = {
  id: 'remote/owc',
  name: 'OWC General',
  priority: 95,
  location: 'REMOTE',
  binId: '1.1 OWC',
  overflowBinId: '1.2 OWC',
  match: (b) => b.owcGroup != null,
}
