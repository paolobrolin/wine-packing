import { describe, it, expect } from 'vitest'
import { remoteBinRules } from '../../../src/bins/remote'
import { resolveBin } from '../../../src/bins/resolve'
import { createCapacityTracker } from '../../../src/bins/capacity'
import type { BinResolverContext } from '../../../src/bins/types'
import type { Bottle } from '../../../src/rules/types'

function makeBottle(overrides: Partial<Bottle> = {}): Bottle {
  return {
    barcode: '0001', iwine: 1, vintage: '2020', wine: 'Test Wine',
    producer: 'Test', country: 'France', region: 'Bordeaux', size: '750ml',
    cost: 500, beginConsume: 2025, endConsume: 2035,
    currentLocation: null, currentBin: null, owcGroup: null,
    ...overrides,
  }
}

function makeContext(): BinResolverContext {
  return {
    currentYear: 2026,
    capacity: createCapacityTracker(new Map()),
    allBottles: [],
    owcGroups: new Map(),
    owcAssignments: new Map(),
  }
}

function resolve(bottle: Bottle) {
  return resolveBin(bottle, 'REMOTE', remoteBinRules, makeContext())
}

describe('REMOTE bin rules — general OWC (p95)', () => {
  it('any OWC-marked bottle → 1.1 OWC', () => {
    const r = resolve(makeBottle({ producer: 'Bodega Catena Zapata', wine: 'Chardonnay White Bones', country: 'Argentina', region: 'Mendoza', owcGroup: 'catena-owc' }))
    expect(r!.binId).toBe('1.1 OWC')
  })

  it('non-OWC bottle does not match', () => {
    const r = resolve(makeBottle({ producer: 'Bodega Catena Zapata', wine: 'Catena Malbec', country: 'Argentina', region: 'Mendoza', owcGroup: null }))
    expect(r!.binId).toBe('1.7 NW + SP OTHER')
  })

  it('SQN OWC still goes to 1.2 (higher priority)', () => {
    const r = resolve(makeBottle({ producer: 'Sine Qua Non', wine: 'SQN Distenta', country: 'USA', region: 'California', owcGroup: 'sqn-2020', size: '750ml' }))
    expect(r!.binId).toBe('1.2 OWC')
  })
})

describe('REMOTE bin rules — producer-specific (p100)', () => {
  it('SQN regular 750ml → 1.3 SQN REGULAR', () => {
    const r = resolve(makeBottle({ producer: 'Sine Qua Non', wine: 'Sine Qua Non Syrah Touché', country: 'USA', region: 'California' }))
    expect(r!.binId).toBe('1.3 SQN REGULAR')
  })

  it('SQN OWC → 1.2 OWC', () => {
    const r = resolve(makeBottle({ producer: 'Sine Qua Non', wine: 'SQN Distenta II', country: 'USA', region: 'California', owcGroup: 'SQN-2020' }))
    expect(r!.binId).toBe('1.2 OWC')
  })

  it('SQN magnum → 1.2 OWC', () => {
    const r = resolve(makeBottle({ producer: 'Sine Qua Non', wine: 'SQN Gorgeous Victim', country: 'USA', region: 'California', size: '1.5L' }))
    expect(r!.binId).toBe('1.2 OWC')
  })

  it('Next of Kyn regular 750ml → 1.4 SQN EC + NoK', () => {
    const r = resolve(makeBottle({ producer: 'Next of Kyn', wine: 'Next of Kyn No~16 Cumulus', country: 'USA', region: 'California' }))
    expect(r!.binId).toBe('1.4 SQN EC + NoK')
  })

  it('Next of Kyn magnum → 1.2 OWC', () => {
    const r = resolve(makeBottle({ producer: 'Next of Kyn', wine: 'Next of Kyn Oito', country: 'USA', region: 'California', size: '1.5L' }))
    expect(r!.binId).toBe('1.2 OWC')
  })

  it('Colgin → 1.5 NAPA', () => {
    const r = resolve(makeBottle({ producer: 'Colgin', wine: 'Colgin IX Estate Red', country: 'USA', region: 'California' }))
    expect(r!.binId).toBe('1.5 NAPA')
  })
})

describe('REMOTE bin rules — Napa + California (p90/p15)', () => {
  it('Kongsgaard → 1.5 NAPA', () => {
    const r = resolve(makeBottle({ producer: 'Kongsgaard', wine: 'Kongsgaard Chardonnay', country: 'USA', region: 'California' }))
    expect(r!.binId).toBe('1.5 NAPA')
  })

  it('Spottswoode → 1.5 NAPA', () => {
    const r = resolve(makeBottle({ producer: 'Spottswoode', wine: 'Spottswoode Cabernet Sauvignon Estate', country: 'USA', region: 'California' }))
    expect(r!.binId).toBe('1.5 NAPA')
  })

  it('BOND → 1.5 NAPA', () => {
    const r = resolve(makeBottle({ producer: 'BOND', wine: 'BOND Melbury', country: 'USA', region: 'California' }))
    expect(r!.binId).toBe('1.5 NAPA')
  })

  it('Saxum → 1.6 CALIFORNIA OTHER', () => {
    const r = resolve(makeBottle({ producer: 'Saxum', wine: 'Saxum G2', country: 'USA', region: 'California' }))
    expect(r!.binId).toBe('1.6 CALIFORNIA OTHER')
  })

  it('Andremily 750ml → 1.6 CALIFORNIA OTHER', () => {
    const r = resolve(makeBottle({ producer: 'Andremily', wine: 'Andremily EABA', country: 'USA', region: 'California' }))
    expect(r!.binId).toBe('1.6 CALIFORNIA OTHER')
  })

  it('Hirsch → 1.6 CALIFORNIA OTHER', () => {
    const r = resolve(makeBottle({ producer: 'Hirsch Vineyards', wine: 'Hirsch Vineyards Pinot Noir East Ridge', country: 'USA', region: 'California' }))
    expect(r!.binId).toBe('1.6 CALIFORNIA OTHER')
  })

  it('Ridge → 1.6 CALIFORNIA OTHER', () => {
    const r = resolve(makeBottle({ producer: 'Ridge', wine: 'Ridge Monte Bello', country: 'USA', region: 'California' }))
    expect(r!.binId).toBe('1.6 CALIFORNIA OTHER')
  })

  it('Bedrock → 1.6 CALIFORNIA OTHER', () => {
    const r = resolve(makeBottle({ producer: 'Bedrock Wine Co.', wine: 'Bedrock Old Vine Zin', country: 'USA', region: 'California' }))
    expect(r!.binId).toBe('1.6 CALIFORNIA OTHER')
  })

  it('Gaja Piedmont → 3.1 PIEMONTE PRESTIGE', () => {
    const r = resolve(makeBottle({ producer: 'Gaja', wine: 'Gaja Sperss Barolo', country: 'Italy', region: 'Piedmont' }))
    expect(r!.binId).toBe('3.1 PIEMONTE PRESTIGE')
  })

  it('Roagna Piedmont → 3.1 PIEMONTE PRESTIGE', () => {
    const r = resolve(makeBottle({ producer: 'Roagna', wine: 'Roagna Crichet Pajé Barbaresco', country: 'Italy', region: 'Piedmont' }))
    expect(r!.binId).toBe('3.1 PIEMONTE PRESTIGE')
  })
})

describe('REMOTE bin rules — sub-region (p50-60)', () => {
  it('Bordeaux LB (Ducru) → 2.1 BDX LB', () => {
    const r = resolve(makeBottle({ producer: 'Château Ducru-Beaucaillou', wine: 'Ducru-Beaucaillou', country: 'France', region: 'Bordeaux' }))
    expect(r!.binId).toBe('2.1 BDX LB')
  })

  it('Bordeaux RB (Cheval Blanc) → 2.2 BDX RB', () => {
    const r = resolve(makeBottle({ producer: 'Château Cheval Blanc', wine: 'Cheval Blanc', country: 'France', region: 'Bordeaux' }))
    expect(r!.binId).toBe('2.2 BDX RB')
  })

  it('Bordeaux RB (Lafleur) → 2.2', () => {
    const r = resolve(makeBottle({ producer: 'Château Lafleur', wine: 'Château Lafleur', country: 'France', region: 'Bordeaux' }))
    expect(r!.binId).toBe('2.2 BDX RB')
  })

  it('Guigal → 2.3 RHONE N', () => {
    const r = resolve(makeBottle({ producer: 'E. Guigal', wine: 'E. Guigal Ermitage Blanc Ex-Voto', country: 'France', region: 'Rhône' }))
    expect(r!.binId).toBe('2.3 RHONE N')
  })

  it('Clos des Papes → 2.4 RHONE S', () => {
    const r = resolve(makeBottle({ producer: 'Clos des Papes', wine: 'Clos des Papes Châteauneuf-du-Pape', country: 'France', region: 'Rhône' }))
    expect(r!.binId).toBe('2.4 RHONE S')
  })

  it('Mosel Riesling → 2.7 DE MOSEL', () => {
    const r = resolve(makeBottle({ producer: 'Dr. Loosen', wine: 'Wehlener Sonnenuhr', country: 'Germany', region: 'Mosel Saar Ruwer' }))
    expect(r!.binId).toBe('2.7 DE MOSEL')
  })

  it('Oddero Barolo → 3.3 BAROLO CLASSIC', () => {
    const r = resolve(makeBottle({ producer: 'Oddero', wine: 'Oddero Barolo Brunate', country: 'Italy', region: 'Piedmont' }))
    expect(r!.binId).toBe('3.3 BAROLO CLASSIC')
  })

  it('E. Pira Barolo → 3.2 BAROLO MODERN', () => {
    const r = resolve(makeBottle({ producer: 'E. Pira', wine: 'E. Pira Barolo Mosconi', country: 'Italy', region: 'Piedmont' }))
    expect(r!.binId).toBe('3.2 BAROLO MODERN')
  })

  it('Unknown Barolo producer → 3.3 BAROLO CLASSIC (fallback)', () => {
    const r = resolve(makeBottle({ producer: 'Unknown Producer', wine: 'Unknown Barolo DOCG', country: 'Italy', region: 'Piedmont' }))
    expect(r!.binId).toBe('3.3 BAROLO CLASSIC')
  })

  it('PdB Barbaresco → 3.4 BARBARESCO', () => {
    const r = resolve(makeBottle({ producer: 'Produttori del Barbaresco', wine: 'Produttori del Barbaresco Barbaresco Riserva Montestefano', country: 'Italy', region: 'Piedmont' }))
    expect(r!.binId).toBe('3.4 BARBARESCO')
  })
})

describe('REMOTE bin rules — region (p30-40)', () => {
  it('Champagne → 2.5 CHAMPAGNE', () => {
    const r = resolve(makeBottle({ producer: 'Louis Roederer', wine: 'Louis Roederer Champagne Brut Nature', country: 'France', region: 'Champagne' }))
    expect(r!.binId).toBe('2.5 CHAMPAGNE')
  })

  it('Burgundy → 2.6 FR OTHER', () => {
    const r = resolve(makeBottle({ producer: 'Domaine Fevre', wine: 'Fevre Chablis GC Les Clos', country: 'France', region: 'Burgundy' }))
    expect(r!.binId).toBe('2.6 FR OTHER')
  })

  it('Jura → 2.6 FR OTHER', () => {
    const r = resolve(makeBottle({ producer: 'Domaine Maire', wine: 'Domaine Maire Arbois Vin Jaune', country: 'France', region: 'Jura' }))
    expect(r!.binId).toBe('2.6 FR OTHER')
  })

  it('Tuscany → 3.5 TOSCANA', () => {
    const r = resolve(makeBottle({ producer: 'Soldera', wine: 'Soldera Brunello', country: 'Italy', region: 'Tuscany' }))
    expect(r!.binId).toBe('3.5 TOSCANA')
  })

  it('Sicily → 3.6 SICILIEN', () => {
    const r = resolve(makeBottle({ producer: 'Frank Cornelissen', wine: 'Cornelissen MunJebel', country: 'Italy', region: 'Sicily' }))
    expect(r!.binId).toBe('3.6 SICILIEN')
  })

  it('Castilla y León → 1.8 CASTILLA', () => {
    const r = resolve(makeBottle({ producer: 'Raúl Pérez', wine: 'Raúl Pérez Ultreia', country: 'Spain', region: 'Castilla y León' }))
    expect(r!.binId).toBe('1.8 CASTILLA')
  })

  it('La Rioja → 1.7 NW + SP OTHER', () => {
    const r = resolve(makeBottle({ producer: 'Bodegas Roda', wine: 'Roda I Reserva', country: 'Spain', region: 'La Rioja' }))
    expect(r!.binId).toBe('1.7 NW + SP OTHER')
  })
})

describe('REMOTE bin rules — catchalls (p10)', () => {
  it('Unknown USA → 1.6 CALIFORNIA OTHER', () => {
    const r = resolve(makeBottle({ producer: 'Some Winery', wine: 'Some Wine', country: 'USA', region: 'Oregon' }))
    expect(r!.binId).toBe('1.6 CALIFORNIA OTHER')
  })

  it('New Zealand → 1.7 NW + SP OTHER', () => {
    const r = resolve(makeBottle({ producer: 'Felton Road', wine: 'Felton Road Pinot Noir', country: 'New Zealand', region: 'South Island' }))
    expect(r!.binId).toBe('1.7 NW + SP OTHER')
  })

  it('Unknown French wine → 2.6 FR OTHER', () => {
    const r = resolve(makeBottle({ producer: 'Unknown', wine: 'Unknown Languedoc', country: 'France', region: 'Languedoc' }))
    expect(r!.binId).toBe('2.6 FR OTHER')
  })

  it('Germany Pfalz → 2.8 DE OTHER', () => {
    const r = resolve(makeBottle({ producer: 'Philipp Kuhn', wine: 'Kuhn Riesling', country: 'Germany', region: 'Pfalz' }))
    expect(r!.binId).toBe('2.8 DE OTHER')
  })

  it('Greece → 1.7 NW + SP OTHER', () => {
    const r = resolve(makeBottle({ producer: 'Dougos', wine: 'Dougos Rapsani', country: 'Greece', region: 'Thessaly' }))
    expect(r!.binId).toBe('1.7 NW + SP OTHER')
  })

  it('Italy Veneto → 3.7 IT OTHER', () => {
    const r = resolve(makeBottle({ producer: 'Quintarelli', wine: 'Quintarelli VCS', country: 'Italy', region: 'Veneto' }))
    expect(r!.binId).toBe('3.7 IT OTHER')
  })

  it('Spain Catalunya → 1.7 NW + SP OTHER', () => {
    const r = resolve(makeBottle({ producer: 'Clos Mogador', wine: 'Clos Mogador Priorat', country: 'Spain', region: 'Catalunya' }))
    expect(r!.binId).toBe('1.7 NW + SP OTHER')
  })

  it('Ferrari Perlé (Italian sparkling) → 2.5 CHAMPAGNE', () => {
    const r = resolve(makeBottle({ producer: 'Ferrari', wine: 'Ferrari Perlé', country: 'Italy', region: 'Trentino-Alto Adige' }))
    expect(r!.binId).toBe('2.5 CHAMPAGNE')
  })

  it('Lebanon → 1.7 NW + SP OTHER', () => {
    const r = resolve(makeBottle({ producer: 'Chateau Musar', wine: 'Musar', country: 'Lebanon', region: 'Bekaa' }))
    expect(r!.binId).toBe('1.7 NW + SP OTHER')
  })
})

describe('REMOTE bin rules — priority ordering', () => {
  it('Colgin beats California catchall', () => {
    const r = resolve(makeBottle({ producer: 'Colgin', wine: 'Colgin IX Estate', country: 'USA', region: 'California' }))
    expect(r!.binId).toBe('1.5 NAPA')
  })

  it('Gaja Barolo beats generic Barolo classic', () => {
    const r = resolve(makeBottle({ producer: 'Gaja', wine: 'Gaja Sperss Barolo', country: 'Italy', region: 'Piedmont' }))
    expect(r!.binId).toBe('3.1 PIEMONTE PRESTIGE')
  })

  it('Guigal beats generic Rhône catchall', () => {
    const r = resolve(makeBottle({ producer: 'E. Guigal', wine: 'E. Guigal Côte-Rôtie', country: 'France', region: 'Rhône' }))
    expect(r!.binId).toBe('2.3 RHONE N')
  })

  it('Champagne beats France catchall', () => {
    const r = resolve(makeBottle({ producer: 'Gosset', wine: 'Gosset Champagne', country: 'France', region: 'Champagne' }))
    expect(r!.binId).toBe('2.5 CHAMPAGNE')
  })

  it('Barbaresco beats Italy catchall', () => {
    const r = resolve(makeBottle({ producer: 'Produttori del Barbaresco', wine: 'PdB Barbaresco Riserva', country: 'Italy', region: 'Piedmont' }))
    expect(r!.binId).toBe('3.4 BARBARESCO')
  })
})
