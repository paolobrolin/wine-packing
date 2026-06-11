import type { BinRule } from '../types'

const RIGHT_BANK_PRODUCERS = [
  'Angélus', 'Angelus', 'Cheval Blanc', 'Tertre', 'Clos Fourtet',
  'Fonroque', 'La Grave', 'Figeac', 'Pavie', 'Troplong', 'Canon',
  'Lafleur', 'Pétrus', 'Petrus', 'Le Pin', 'Trotanoy', 'Gazin',
  'La Conseillante', 'Vieux Château Certan',
]

const LEFT_BANK_PRODUCERS = [
  'Latour', 'Lafite', 'Mouton', 'Margaux', 'Haut-Brion',
  'Lynch-Bages', 'Ducru', 'Calon', 'Léoville', 'Pichon',
  'd\'Issan', 'Rauzan', 'Palmer', 'Cos d\'Estournel',
  'Montrose', 'Pontet-Canet', 'LLC', 'Lagrange',
]

function isBordeaux(country: string, region: string): boolean {
  if (country !== 'France') return false
  return region === 'Bordeaux' || region.includes('Bordeaux')
}

export const bdxRbRule: BinRule = {
  id: 'remote/bdx-rb',
  name: 'Bordeaux Right Bank',
  priority: 50,
  location: 'REMOTE',
  binId: '2.2 BDX RB',
  overflowBinId: '2.6 FR OTHER',
  match: (b) => {
    if (!isBordeaux(b.country, b.region)) return false
    return RIGHT_BANK_PRODUCERS.some((p) => b.producer.includes(p) || b.wine.includes(p))
  },
}

export const bdxLbRule: BinRule = {
  id: 'remote/bdx-lb',
  name: 'Bordeaux Left Bank',
  priority: 50,
  location: 'REMOTE',
  binId: '2.1 BDX LB',
  overflowBinId: '2.6 FR OTHER',
  match: (b) => {
    if (!isBordeaux(b.country, b.region)) return false
    return LEFT_BANK_PRODUCERS.some((p) => b.producer.includes(p) || b.wine.includes(p))
  },
}
