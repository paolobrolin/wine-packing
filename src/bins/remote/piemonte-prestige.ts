import type { BinRule } from '../types'

const PRESTIGE_PRODUCERS = ['Gaja', 'Mascarello', 'Roagna']

export const piemontePrestigeRule: BinRule = {
  id: 'remote/piemonte-prestige',
  name: 'Piemonte Prestige',
  priority: 90,
  location: 'REMOTE',
  binId: '3.1 PIEMONTE PRESTIGE',
  overflowBinId: '3.3 BAROLO CLASSIC',
  match: (b) => {
    if (b.country !== 'Italy' || b.region !== 'Piedmont') return false
    return PRESTIGE_PRODUCERS.some((p) => b.producer.includes(p))
  },
}
