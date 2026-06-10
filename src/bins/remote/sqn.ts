import type { BinRule } from '../types'

function isSqn(producer: string): boolean {
  return producer.includes('Sine Qua Non')
}

function isNoK(producer: string): boolean {
  return producer.includes('Next of Kyn')
}

export const sqnOwcRule: BinRule = {
  id: 'remote/sqn-owc',
  name: 'SQN + NoK OWC / Magnums',
  priority: 100,
  location: 'REMOTE',
  binId: '1.2 OWC',
  overflowBinId: '1.1 OWC',
  match: (b) => (isSqn(b.producer) || isNoK(b.producer)) && (b.owcGroup != null || b.size !== '750ml'),
}

export const sqnRegularRule: BinRule = {
  id: 'remote/sqn-regular',
  name: 'SQN Regular 750ml',
  priority: 100,
  location: 'REMOTE',
  binId: '1.3 SQN REGULAR',
  overflowBinId: '1.8 NEW WORLD OTHER',
  match: (b) => isSqn(b.producer) && b.size === '750ml' && b.owcGroup == null,
}

export const nokRegularRule: BinRule = {
  id: 'remote/nok-regular',
  name: 'Next of Kyn Regular',
  priority: 100,
  location: 'REMOTE',
  binId: '1.4 SQN EC + NoK',
  overflowBinId: '1.6 SAX + KONGS + ANDR',
  match: (b) => isNoK(b.producer) && b.size === '750ml' && b.owcGroup == null,
}
