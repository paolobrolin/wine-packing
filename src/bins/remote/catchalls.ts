import type { BinRule } from '../types'

const NEW_WORLD_COUNTRIES = ['Australia', 'New Zealand', 'South Africa', 'Argentina', 'Chile']

export const newWorldCatchallRule: BinRule = {
  id: 'remote/new-world-catchall',
  name: 'New World + SP Other',
  priority: 10,
  location: 'REMOTE',
  binId: '1.7 NW + SP OTHER',
  overflowBinId: null,
  match: (b) => NEW_WORLD_COUNTRIES.includes(b.country),
}

export const frCatchallRule: BinRule = {
  id: 'remote/fr-catchall',
  name: 'France Other',
  priority: 10,
  location: 'REMOTE',
  binId: '2.6 FR OTHER',
  overflowBinId: null,
  match: (b) => b.country === 'France',
}

export const deCatchallRule: BinRule = {
  id: 'remote/de-catchall',
  name: 'Germany + Other Europe',
  priority: 10,
  location: 'REMOTE',
  binId: '2.8 DE OTHER',
  overflowBinId: null,
  match: (b) => ['Germany', 'Greece', 'Austria', 'Hungary'].includes(b.country),
}

export const itCatchallRule: BinRule = {
  id: 'remote/it-catchall',
  name: 'Italy Other',
  priority: 10,
  location: 'REMOTE',
  binId: '3.7 IT OTHER',
  overflowBinId: null,
  match: (b) => b.country === 'Italy',
}

export const spCatchallRule: BinRule = {
  id: 'remote/sp-catchall',
  name: 'Spain Other (Rioja, Catalunya, etc.)',
  priority: 10,
  location: 'REMOTE',
  binId: '1.7 NW + SP OTHER',
  overflowBinId: null,
  match: (b) => b.country === 'Spain',
}

export const globalFallbackRule: BinRule = {
  id: 'remote/global-fallback',
  name: 'Global Fallback',
  priority: 1,
  location: 'REMOTE',
  binId: '2.8 DE OTHER',
  overflowBinId: null,
  match: () => true,
}
