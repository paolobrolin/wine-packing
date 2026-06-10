import type { BinRule } from '../types'

const MODERN_PRODUCERS = [
  'E. Pira', 'Chiara Boschis', 'Sandrone', 'Elio Grasso', 'Cavallotto',
  'Scavino', 'Vietti', 'Ceretto', 'Aldo Conterno', 'Clerico',
  'Elvio Cogno', 'Burlotto',
]

const CLASSIC_PRODUCERS = [
  'Oddero', 'Massolino', 'Einaudi', 'Poderi Einaudi',
  'Giacomo Conterno', 'Bartolo Mascarello', 'Borgogno',
  'Brovia', 'Cappellano', 'Rinaldi',
]

function isBarolo(wine: string, region: string): boolean {
  return region === 'Piedmont' && wine.includes('Barolo')
}

export const baroloModernRule: BinRule = {
  id: 'remote/barolo-modern',
  name: 'Barolo Modern',
  priority: 60,
  location: 'REMOTE',
  binId: '3.2 BAROLO MODERN',
  overflowBinId: '3.3 BAROLO CLASSIC',
  match: (b) => {
    if (b.country !== 'Italy' || !isBarolo(b.wine, b.region)) return false
    return MODERN_PRODUCERS.some((p) => b.producer.includes(p))
  },
}

export const baroloClassicRule: BinRule = {
  id: 'remote/barolo-classic',
  name: 'Barolo Classic',
  priority: 60,
  location: 'REMOTE',
  binId: '3.3 BAROLO CLASSIC',
  overflowBinId: '3.8 OVERFLOW',
  match: (b) => {
    if (b.country !== 'Italy' || !isBarolo(b.wine, b.region)) return false
    return CLASSIC_PRODUCERS.some((p) => b.producer.includes(p))
  },
}

export const baroloFallbackRule: BinRule = {
  id: 'remote/barolo-fallback',
  name: 'Barolo (unclassified)',
  priority: 55,
  location: 'REMOTE',
  binId: '3.3 BAROLO CLASSIC',
  overflowBinId: '3.8 OVERFLOW',
  match: (b) => b.country === 'Italy' && isBarolo(b.wine, b.region),
}
