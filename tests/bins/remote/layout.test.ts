import { describe, it, expect } from 'vitest'
import { remoteBinRules } from '../../../src/bins/remote'
import { resolveBin } from '../../../src/bins/resolve'
import { createCapacityTracker } from '../../../src/bins/capacity'
import { REMOTE_BINS, isRemoteBin } from '../../../src/bins/all-bins'
import type { BinResolverContext } from '../../../src/bins/types'
import type { Bottle } from '../../../src/rules/types'

// The 2026-11 layout: Skåp 1 holds OWC cases, bulky single boxes and SQN/NoK;
// Skåp 2–5 hold loose bottles, each shelf one region group (see layout.ts).

function b(overrides: Partial<Bottle> = {}): Bottle {
  return {
    barcode: '0001', iwine: 1, vintage: '2020', wine: 'Test Wine',
    producer: 'Test', country: 'France', region: 'Bordeaux', size: '750ml',
    cost: 500, beginConsume: 2030, endConsume: 2045,
    currentLocation: null, currentBin: null, owcGroup: null, wineType: 'Red',
    subRegion: null, appellation: null, bottleNote: null,
    ...overrides,
  }
}

function ctx(): BinResolverContext {
  return { currentYear: 2026, capacity: createCapacityTracker(new Map()), allBottles: [], owcGroups: new Map(), owcAssignments: new Map() }
}

const bin = (o: Partial<Bottle>) => resolveBin(b(o), 'REMOTE', remoteBinRules, ctx())?.binId

const it_ = (o: Partial<Bottle>) => ({ country: 'Italy', region: 'Piedmont', ...o })

describe('layout 2026-11 — Skåp 1 (OWC cabinet)', () => {
  it('an OWC case goes to 1.1 OWC', () => {
    expect(bin({ owcGroup: 'SB W123', bottleNote: 'OWC 1x6 (Clos des Papes 2023, 2 lådor)', country: 'France', region: 'Rhône' })).toBe('1.1 OWC')
  })
  it('a bulky single box (note "OWC 1x1") goes to 1.2 OWC SINGLES', () => {
    expect(bin({ owcGroup: 'x', bottleNote: 'OWC 1x1 (singellåda)', producer: 'Château Cheval Blanc', subRegion: 'Libournais' })).toBe('1.2 OWC SINGLES')
  })
  it('regular SQN, red and white, goes to 1.3 SQN REGULAR', () => {
    expect(bin({ producer: 'Sine Qua Non', wine: 'Sine Qua Non Grenache Distenta III', country: 'USA', region: 'California' })).toBe('1.3 SQN REGULAR')
    expect(bin({ producer: 'Sine Qua Non', wine: 'Sine Qua Non Syrah Distenta IV', country: 'USA', region: 'California' })).toBe('1.3 SQN REGULAR')
  })
  it('SQN from Eleven Confessions and Next of Kyn share 1.4 SQN EC + NoK', () => {
    expect(bin({ producer: 'Sine Qua Non', wine: 'Sine Qua Non Syrah Estate Eleven Confessions Vineyard', country: 'USA', region: 'California' })).toBe('1.4 SQN EC + NoK')
    expect(bin({ producer: 'Sine Qua Non', wine: 'Sine Qua Non Grenache Pajarito Del Amor Eleven Confessions Vineyard', country: 'USA', region: 'California' })).toBe('1.4 SQN EC + NoK')
    expect(bin({ producer: 'Next of Kyn', wine: 'Next of Kyn No~16 Cumulus Vineyard', country: 'USA', region: 'California' })).toBe('1.4 SQN EC + NoK')
  })
})

describe('layout 2026-11 — Piedmont', () => {
  it.each([
    ['Boroli', '2.1 BAROLO A–F'], ['E. Pira & Figli (Chiara Boschis)', '2.1 BAROLO A–F'], ['Fratelli Brovia', '2.1 BAROLO A–F'],
    ['Gaja', '2.2 BAROLO G–L'], ['G.D. Vajra', '2.2 BAROLO G–L'], ['Luigi Pira', '2.2 BAROLO G–L'],
    ['Massolino', '2.3 BAROLO M–PIE'], ['Oddero', '2.3 BAROLO M–PIE'], ['Paolo Scavino', '2.3 BAROLO M–PIE'], ['Piero Benevelli', '2.3 BAROLO M–PIE'],
    ['Pio Cesare', '2.4 BAROLO PIO–Z'], ['Poderi Luigi Einaudi', '2.4 BAROLO PIO–Z'], ['Renato Ratti', '2.4 BAROLO PIO–Z'], ['Vietti', '2.4 BAROLO PIO–Z'],
  ])('Barolo by %s → %s', (producer, expected) => {
    expect(bin(it_({ producer, wine: `${producer} Barolo`, appellation: 'Barolo', cost: 900 }))).toBe(expected)
  })

  it('Barolo from 1 999 kr a bottle goes to 2.5 BAROLO PRESTIGE', () => {
    expect(bin(it_({ producer: 'Roagna', wine: 'Roagna Barolo Pira', appellation: 'Barolo', cost: 1999 }))).toBe('2.5 BAROLO PRESTIGE')
    expect(bin(it_({ producer: 'Gaja', wine: 'Gaja Barbaresco', appellation: 'Barbaresco', size: '1.5L', cost: 5495 }))).toBe('2.5 BAROLO PRESTIGE')
    expect(bin(it_({ producer: 'Vietti', wine: 'Vietti Barolo Rocche di Castiglione', appellation: 'Barolo', cost: 1799 }))).toBe('2.4 BAROLO PIO–Z')
  })

  it('Langhe Nebbiolo, Barbera and other Piedmont reds go to 2.6 PIEMONTE OTHER', () => {
    expect(bin(it_({ producer: 'Olek Bondonio', wine: 'Olek Bondonio Langhe Nebbiolo', appellation: 'Langhe DOC' }))).toBe('2.6 PIEMONTE OTHER')
    expect(bin(it_({ producer: 'Giuseppe E Figlio Mascarello', wine: 'Mascarello Barbera d\'Alba Superiore Scudetto', appellation: "Barbera d'Alba Superiore" }))).toBe('2.6 PIEMONTE OTHER')
    expect(bin(it_({ producer: 'Gaja', wine: 'Gaja Langhe Sito Moresco', appellation: 'Langhe DOC', cost: 2500 }))).toBe('2.6 PIEMONTE OTHER')
  })

  it('Gaja\'s Barbaresco sits with Gaja\'s Barolo', () => {
    expect(bin(it_({ producer: 'Gaja', wine: 'Gaja Barbaresco', appellation: 'Barbaresco', cost: 900 }))).toBe('2.2 BAROLO G–L')
  })

  it('Piedmont whites (Timorasso, Langhe Chardonnay) go to 2.7', () => {
    expect(bin(it_({ producer: 'Vietti', wine: 'Vietti Timorasso Colli Tortonesi Derthona Boscogrosso', appellation: 'Colli Tortonesi', wineType: 'White' }))).toBe('2.7 PIEMONTE WHITE')
    expect(bin(it_({ producer: 'Pio Cesare', wine: 'Pio Cesare Langhe Chardonnay Piodilei', appellation: 'Langhe DOC', wineType: 'White' }))).toBe('2.7 PIEMONTE WHITE')
  })

  it('Barbaresco: Produttori Riserva and Produttori magnums on 3.2, the rest on 3.1', () => {
    const pdb = 'Produttori del Barbaresco'
    expect(bin(it_({ producer: pdb, wine: `${pdb} Barbaresco Riserva Asili`, appellation: 'Barbaresco' }))).toBe('3.2 BARBARESCO PDB')
    expect(bin(it_({ producer: pdb, wine: `${pdb} Barbaresco`, appellation: 'Barbaresco', size: '1.5L' }))).toBe('3.2 BARBARESCO PDB')
    expect(bin(it_({ producer: pdb, wine: `${pdb} Barbaresco`, appellation: 'Barbaresco' }))).toBe('3.1 BARBARESCO')
    expect(bin(it_({ producer: 'Sottimano', wine: 'Sottimano Barbaresco Riserva', appellation: 'Barbaresco' }))).toBe('3.1 BARBARESCO')
  })

  it('Piedmont sparkling goes to the sparkling shelves, not Piedmont', () => {
    expect(bin(it_({ producer: 'Ettore Germano', wine: 'Ettore Germano Alta Langa', wineType: 'White - Sparkling' }))).toBe('3.7 SPARKLING A–K')
  })
})

describe('layout 2026-11 — rest of Italy, Spain, Greece', () => {
  const tos = (o: Partial<Bottle>) => b({ country: 'Italy', region: 'Tuscany', ...o })
  it('Montalcino on 3.3B; other Tuscany split A–H / I–Z', () => {
    expect(bin(tos({ producer: 'Le Ragnaie', subRegion: 'Montalcino', cost: 1139 }))).toBe('3.3B TOSCANA MONTALCINO')
    expect(bin(tos({ producer: 'Fontodi', subRegion: 'Chianti' }))).toBe('3.4 TOSCANA A–H')
    expect(bin(tos({ producer: 'Tua Rita', subRegion: 'Unknown' }))).toBe('3.5 TOSCANA I–Z')
  })
  it('Tuscany from 2 000 kr a bottle, from anywhere in Tuscany, on 3.3A TOSCANA PRESTIGE', () => {
    expect(bin(tos({ producer: 'Soldera (Az. Agr. Case Basse)', subRegion: 'Montalcino', cost: 6299 }))).toBe('3.3A TOSCANA PRESTIGE')
    expect(bin(tos({ producer: 'Fontodi', subRegion: 'Chianti', size: '1.5L', cost: 2399 }))).toBe('3.3A TOSCANA PRESTIGE')
    expect(bin(tos({ producer: 'Tenuta Greppo (Biondi-Santi)', subRegion: 'Montalcino', cost: 2000 }))).toBe('3.3A TOSCANA PRESTIGE')
    expect(bin(tos({ producer: 'Pian dell\'Orino', subRegion: 'Montalcino', cost: 1435 }))).toBe('3.3B TOSCANA MONTALCINO')
    // CT's cost is in the bottle's own currency: 200 EUR is about 2 200 kr.
    expect(bin(tos({ producer: 'Tenuta Greppo (Biondi-Santi)', subRegion: 'Montalcino', cost: 200, costCurrency: 'EUR' }))).toBe('3.3A TOSCANA PRESTIGE')
    expect(bin(tos({ producer: 'Fattoi', subRegion: 'Montalcino', cost: 75, costCurrency: 'EUR' }))).toBe('3.3B TOSCANA MONTALCINO')
  })
  it('Sicily A–P on 4.1; Sicily Q–Z and other Italy on 4.2', () => {
    expect(bin(b({ country: 'Italy', region: 'Sicily', producer: 'Passopisciaro' }))).toBe('4.1 SICILIA A–P')
    expect(bin(b({ country: 'Italy', region: 'Sicily', producer: 'Tenuta delle Terre Nere' }))).toBe('4.2 SICILIA Q–Z + IT OTHER')
    expect(bin(b({ country: 'Italy', region: 'Trentino-Alto Adige', producer: 'Cantina Terlan', wineType: 'White' }))).toBe('4.2 SICILIA Q–Z + IT OTHER')
  })
  it('Spain: Duero/Toro/Gredos + Greece, northwest + Priorat, Rioja', () => {
    expect(bin(b({ country: 'Spain', region: 'Castilla y León', appellation: 'Ribera del Duero', producer: 'Dominio Pingus' }))).toBe('4.3 SP DUERO + GREECE')
    expect(bin(b({ country: 'Greece', region: 'Macedonia', producer: 'Alpha Estate' }))).toBe('4.3 SP DUERO + GREECE')
    expect(bin(b({ country: 'Spain', region: 'Castilla y León', appellation: 'Bierzo', producer: 'Raul Pérez' }))).toBe('4.4 SP NW + PRIORAT')
    expect(bin(b({ country: 'Spain', region: 'Catalunya', appellation: 'Priorat', producer: 'Clos Erasmus' }))).toBe('4.4 SP NW + PRIORAT')
    expect(bin(b({ country: 'Spain', region: 'La Rioja', appellation: 'Rioja', producer: 'R. López de Heredia' }))).toBe('4.5 SP RIOJA')
  })
  it('Cava goes to the sparkling shelves', () => {
    expect(bin(b({ country: 'Spain', region: 'Catalunya', appellation: 'Cava', producer: 'Raventós i Blanc', wineType: 'White - Sparkling' }))).toBe('3.8 SPARKLING L–Z')
  })
})

describe('layout 2026-11 — France', () => {
  it('sparkling split by producer A–K / L–Z', () => {
    expect(bin(b({ region: 'Champagne', producer: 'Bollinger', wineType: 'White - Sparkling' }))).toBe('3.7 SPARKLING A–K')
    expect(bin(b({ region: 'Champagne', producer: 'Louis Roederer', wineType: 'White - Sparkling' }))).toBe('3.8 SPARKLING L–Z')
  })
  it('Bordeaux by bank; sweet Bordeaux is not on the bank shelves', () => {
    expect(bin(b({ producer: 'Château Giscours', subRegion: 'Médoc' }))).toBe('2.8 BDX LB')
    expect(bin(b({ producer: 'Château Haut-Bailly', subRegion: 'Graves' }))).toBe('2.8 BDX LB')
    expect(bin(b({ producer: 'Château Figeac', subRegion: 'Libournais' }))).toBe('2.9 BDX RB')
    expect(bin(b({ producer: 'Château Suduiraut', subRegion: 'Sauternais', wineType: 'White - Sweet/Dessert' }))).toBe('3.6 FR OTHER')
  })
  it('Bourgogne, Rhône, Jura each have a shelf; the rest of France goes to 3.8', () => {
    expect(bin(b({ region: 'Burgundy', producer: 'Domaine Leroy' }))).toBe('4.6 BOURGOGNE')
    expect(bin(b({ region: 'Rhône', producer: 'E. Guigal' }))).toBe('4.7 RHONE')
    expect(bin(b({ region: 'Jura', producer: 'Domaine Tissot', wineType: 'White' }))).toBe('4.8 JURA')
    expect(bin(b({ region: 'Loire Valley', producer: 'Nicolas Joly', wineType: 'White' }))).toBe('3.6 FR OTHER')
  })
})

describe('layout 2026-11 — Germany, USA, New World', () => {
  it('Mosel + Nahe split A–E / F–Z', () => {
    expect(bin(b({ country: 'Germany', region: 'Nahe', producer: 'Dönnhoff', wineType: 'White' }))).toBe('5.1 DE MOSEL + NAHE A–E')
    expect(bin(b({ country: 'Germany', region: 'Mosel Saar Ruwer', producer: 'Willi Schaefer', wineType: 'White' }))).toBe('5.2 DE MOSEL + NAHE F–Z')
  })
  it('other Germany + Austria split A–Q / R–Z', () => {
    expect(bin(b({ country: 'Germany', region: 'Pfalz', producer: 'Philipp Kuhn' }))).toBe('5.3 DE OTHER A–Q + AT')
    expect(bin(b({ country: 'Austria', region: 'Niederösterreich', producer: 'Weingut Josef Jamek', wineType: 'White' }))).toBe('5.3 DE OTHER A–Q + AT')
    expect(bin(b({ country: 'Germany', region: 'Pfalz', producer: 'von Winning', wineType: 'White' }))).toBe('5.4 DE OTHER R–Z')
  })
  it('a leading "Weingut" is not the producer\'s initial (Weingut Keller is a K)', () => {
    expect(bin(b({ country: 'Germany', region: 'Rheinhessen', producer: 'Weingut Keller', wineType: 'White' }))).toBe('5.3 DE OTHER A–Q + AT')
    expect(bin(b({ country: 'Germany', region: 'Rheingau', producer: 'Weingut Robert Weil', wineType: 'White' }))).toBe('5.4 DE OTHER R–Z')
  })
  it('Saxum, Napa, other USA, New World', () => {
    expect(bin(b({ country: 'USA', region: 'California', producer: 'Saxum', subRegion: 'Central Coast' }))).toBe('5.5 SAXUM')
    expect(bin(b({ country: 'USA', region: 'California', producer: 'Spottswoode', subRegion: 'Napa Valley' }))).toBe('5.6 NAPA')
    expect(bin(b({ country: 'USA', region: 'California', producer: 'Ridge', subRegion: 'Santa Cruz Mountains' }))).toBe('5.7 USA OTHER')
    expect(bin(b({ country: 'USA', region: 'Oregon', producer: 'Beaux Frères' }))).toBe('5.7 USA OTHER')
    expect(bin(b({ country: 'Australia', region: 'South Australia', producer: 'Penfolds' }))).toBe('5.8 NEW WORLD')
    expect(bin(b({ country: 'Argentina', region: 'Mendoza', producer: 'Catena Zapata', wineType: 'White' }))).toBe('5.8 NEW WORLD')
  })
})

describe('layout 2026-11 — bin registry', () => {
  it('every rule targets a bin in REMOTE_BINS', () => {
    for (const r of remoteBinRules) {
      expect(REMOTE_BINS as readonly string[]).toContain(r.binId)
      if (r.overflowBinId) expect(REMOTE_BINS as readonly string[]).toContain(r.overflowBinId)
    }
  })
  it('old external bin names are still recognised as REMOTE during the move', () => {
    expect(isRemoteBin('3.3 BAROLO CLASSIC')).toBe(true)
    expect(isRemoteBin('2.6 FR OTHER')).toBe(true)
    expect(isRemoteBin('3.3B TOSCANA MONTALCINO')).toBe(true)
    expect(isRemoteBin('Lgh 2. FRANKRIKE')).toBe(false)
  })
})
