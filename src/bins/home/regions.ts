import type { BinRule } from '../types'

export const homeItalyRule: BinRule = {
  id: 'home/italy',
  name: 'Italia',
  priority: 30,
  location: 'HOME',
  binId: '1. ITALIA',
  overflowBinId: null,
  match: (b) => b.country === 'Italy',
}

export const homeFranceRule: BinRule = {
  id: 'home/france',
  name: 'Frankrike',
  priority: 30,
  location: 'HOME',
  binId: '2. FRANKRIKE',
  overflowBinId: null,
  match: (b) => b.country === 'France',
}

export const homeSpainRule: BinRule = {
  id: 'home/spain',
  name: 'Spanien + Övrigt',
  priority: 30,
  location: 'HOME',
  binId: '3. SPANIEN + OVRIGT',
  overflowBinId: null,
  match: (b) => b.country === 'Spain',
}

export const homeUsaRule: BinRule = {
  id: 'home/usa',
  name: 'USA',
  priority: 30,
  location: 'HOME',
  binId: '4. USA',
  overflowBinId: null,
  match: (b) => ['USA', 'Australia', 'New Zealand', 'South Africa', 'Argentina', 'Chile'].includes(b.country),
}

export const homeGermanyRule: BinRule = {
  id: 'home/germany',
  name: 'Tyskland + Övrigt',
  priority: 20,
  location: 'HOME',
  binId: '3. SPANIEN + OVRIGT',
  overflowBinId: null,
  match: (b) => ['Germany', 'Greece', 'Austria', 'Hungary', 'Lebanon', 'Portugal'].includes(b.country),
}

export const homeFallbackRule: BinRule = {
  id: 'home/fallback',
  name: 'Övrigt',
  priority: 1,
  location: 'HOME',
  binId: '3. SPANIEN + OVRIGT',
  overflowBinId: null,
  match: () => true,
}
