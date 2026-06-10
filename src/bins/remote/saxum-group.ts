import type { BinRule } from '../types'

const PRODUCERS = ['Saxum', 'Kongsgaard', 'Andremily']

export const saxumGroupRule: BinRule = {
  id: 'remote/saxum-group',
  name: 'Saxum + Kongsgaard + Andremily',
  priority: 90,
  location: 'REMOTE',
  binId: '1.6 SAX + KONGS + ANDR',
  overflowBinId: '1.8 NEW WORLD OTHER',
  match: (b) => PRODUCERS.some((p) => b.producer.includes(p)) && b.size === '750ml' && b.owcGroup == null,
}
