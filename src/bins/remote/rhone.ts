import type { BinRule } from '../types'

const NORTH_APPELLATIONS = [
  'Hermitage', 'Ermitage', 'Côte-Rôtie', 'Cote-Rotie', 'Côte Rôtie',
  'Saint-Joseph', 'St-Joseph', 'Cornas', 'Condrieu', 'Crozes-Hermitage',
]

const NORTH_PRESTIGE_PRODUCERS = [
  'Guigal', 'Jaboulet', 'Chapoutier', 'Chave', 'Clape', 'Allemand',
  'Gangloff', 'Jamet', 'Rostaing', 'Vernay',
]

function isRhone(country: string, region: string): boolean {
  return country === 'France' && (region === 'Rhône' || region === 'Rhone' || region.includes('Rhône') || region.includes('Rhone'))
}

function isNorthernRhone(producer: string, wine: string): boolean {
  if (NORTH_PRESTIGE_PRODUCERS.some((p) => producer.includes(p))) return true
  return NORTH_APPELLATIONS.some((a) => wine.includes(a) || producer.includes(a))
}

export const rhoneNorthRule: BinRule = {
  id: 'remote/rhone-n',
  name: 'Rhône Nord',
  priority: 50,
  location: 'REMOTE',
  binId: '2.3 RHONE N',
  overflowBinId: '2.4 RHONE S',
  match: (b) => isRhone(b.country, b.region) && isNorthernRhone(b.producer, b.wine),
}

export const rhoneSouthRule: BinRule = {
  id: 'remote/rhone-s',
  name: 'Rhône Sud',
  priority: 45,
  location: 'REMOTE',
  binId: '2.4 RHONE S',
  overflowBinId: '2.6 FR OTHER',
  match: (b) => isRhone(b.country, b.region),
}
