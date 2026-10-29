import type { BinRule } from '../types'
import type { Bottle } from '../../rules/types'

// The 2026-11 layout (five cabinets). Skåp 1 holds OWC cases, bulky single
// boxes and SQN/NoK; Skåp 2–5 hold loose bottles, one region group per shelf,
// spread so every cabinet keeps roughly the same buffer. Groups that are too
// big for one shelf are split by the first letter of the producer, so a new
// producer always has an obvious place.

/**
 * First letter of the producer, accents and case folded ('Château X' → 'c').
 * A leading "Weingut" is skipped: CT names some German estates that way
 * ('Weingut Keller' → 'k').
 */
function initial(producer: string): string {
  return producer.replace(/^Weingut\s+/i, '').normalize('NFKD').replace(/[^\p{L}]/gu, '').charAt(0).toLowerCase()
}

const inRange = (p: string, from: string, to: string) => {
  const c = initial(p)
  return c >= from && c <= to
}

const isSparkling = (b: Bottle) => (b.wineType ?? '').includes('Sparkling')
const isSweet = (b: Bottle) => (b.wineType ?? '').includes('Sweet')
const isWhite = (b: Bottle) => (b.wineType ?? '').startsWith('White')
const appellation = (b: Bottle) => b.appellation ?? ''
const isSqn = (b: Bottle) => b.producer.includes('Sine Qua Non')
const isNoK = (b: Bottle) => b.producer.includes('Next of Kyn') || b.producer.includes('Third Twin')
const isPiedmont = (b: Bottle) => b.country === 'Italy' && b.region === 'Piedmont'
const isBarolo = (b: Bottle) => appellation(b) === 'Barolo' || (appellation(b) === '' && b.wine.includes('Barolo'))
const isBarbaresco = (b: Bottle) => appellation(b) === 'Barbaresco' || (appellation(b) === '' && b.wine.includes('Barbaresco'))
const isPdB = (b: Bottle) => b.producer === 'Produttori del Barbaresco'

/** A bulky single box kept in the OWC cabinet: bottle note "OWC 1x1" (or "singel"). */
const isSingleBox = (b: Bottle) => /\b1\s*x\s*1\b|singel|single/i.test(b.bottleNote ?? '')

const SPAIN_DUERO = ['Ribera del Duero', 'Toro', 'Cebreros', 'Vinos de Madrid', 'Rueda', 'Cigales']
const NEW_WORLD = ['Australia', 'New Zealand', 'South Africa', 'Argentina', 'Chile', 'Uruguay', 'Canada']
const MEDITERRANEAN = ['Greece', 'Lebanon', 'Portugal', 'Hungary', 'Croatia', 'Slovenia', 'Georgia', 'Israel']

type Spec = { id: string; binId: string; priority: number; match: (b: Bottle) => boolean }

const SPECS: Spec[] = [
  // Skåp 1 — OWC cabinet
  { id: 'owc-single', binId: '1.2 OWC SINGLES', priority: 100, match: (b) => b.owcGroup != null && isSingleBox(b) },
  { id: 'owc', binId: '1.1 OWC', priority: 99, match: (b) => b.owcGroup != null },
  // Same names as the old layout: the SQN bottles are already there in CT.
  { id: 'sqn-ec-nok', binId: '1.4 SQN EC + NoK', priority: 90, match: (b) => (isSqn(b) && b.wine.includes('Eleven Confessions')) || isNoK(b) },
  { id: 'sqn-regular', binId: '1.3 SQN REGULAR', priority: 89, match: (b) => isSqn(b) },

  // Sparkling from anywhere (Champagne, Cava, Alta Langa, …)
  { id: 'sparkling-a-k', binId: '3.6 SPARKLING A–K', priority: 80, match: (b) => isSparkling(b) && inRange(b.producer, 'a', 'k') },
  { id: 'sparkling-l-z', binId: '3.7 SPARKLING L–Z', priority: 79, match: (b) => isSparkling(b) || b.region === 'Champagne' },

  // Piedmont
  { id: 'piemonte-white', binId: '2.6 PIEMONTE WHITE', priority: 70, match: (b) => isPiedmont(b) && isWhite(b) && !isSweet(b) },
  { id: 'barbaresco-pdb', binId: '3.2 BARBARESCO PDB', priority: 69, match: (b) => isPiedmont(b) && isBarbaresco(b) && isPdB(b) && (b.wine.includes('Riserva') || b.size !== '750ml') },
  // Gaja's Barbaresco sits with Gaja's Barolo (falls through to the Barolo letter rules)
  { id: 'barbaresco', binId: '3.1 BARBARESCO', priority: 68, match: (b) => isPiedmont(b) && isBarbaresco(b) && !b.producer.startsWith('Gaja') },
  { id: 'barolo-a-e', binId: '2.1 BAROLO A–E', priority: 66, match: (b) => isPiedmont(b) && (isBarolo(b) || isBarbaresco(b)) && inRange(b.producer, 'a', 'e') },
  { id: 'barolo-f-k', binId: '2.2 BAROLO F–K', priority: 65, match: (b) => isPiedmont(b) && (isBarolo(b) || isBarbaresco(b)) && inRange(b.producer, 'f', 'k') },
  { id: 'barolo-l-o', binId: '2.3 BAROLO L–O', priority: 64, match: (b) => isPiedmont(b) && (isBarolo(b) || isBarbaresco(b)) && inRange(b.producer, 'l', 'o') },
  { id: 'barolo-p-q', binId: '2.4 BAROLO P–Q', priority: 63, match: (b) => isPiedmont(b) && (isBarolo(b) || isBarbaresco(b)) && inRange(b.producer, 'p', 'q') },
  // R–Z Barolo plus every other Piedmont red (Langhe Nebbiolo, Barbera, Dolcetto, …)
  { id: 'barolo-r-z-langhe', binId: '2.5 BAROLO R–Z + LANGHE', priority: 62, match: (b) => isPiedmont(b) },

  // Rest of Italy
  { id: 'toscana-montalcino', binId: '3.3 TOSCANA MONTALCINO', priority: 50, match: (b) => b.country === 'Italy' && b.region === 'Tuscany' && b.subRegion === 'Montalcino' },
  { id: 'toscana-a-h', binId: '3.4 TOSCANA A–H', priority: 49, match: (b) => b.country === 'Italy' && b.region === 'Tuscany' && inRange(b.producer, 'a', 'h') },
  { id: 'toscana-i-z', binId: '3.5 TOSCANA I–Z', priority: 48, match: (b) => b.country === 'Italy' && b.region === 'Tuscany' },
  { id: 'sicilia-a-p', binId: '4.1 SICILIA A–P', priority: 47, match: (b) => b.country === 'Italy' && b.region === 'Sicily' && inRange(b.producer, 'a', 'p') },
  { id: 'sicilia-q-z-it-other', binId: '4.2 SICILIA Q–Z + IT OTHER', priority: 46, match: (b) => b.country === 'Italy' },

  // Spain + Greece and the rest of the Mediterranean
  { id: 'sp-duero-greece', binId: '4.3 SP DUERO + GREECE', priority: 45, match: (b) => (b.country === 'Spain' && SPAIN_DUERO.includes(appellation(b))) || MEDITERRANEAN.includes(b.country) },
  { id: 'sp-rioja', binId: '4.5 SP RIOJA', priority: 44, match: (b) => b.country === 'Spain' && (appellation(b) === 'Rioja' || b.region === 'La Rioja') },
  { id: 'sp-nw-priorat', binId: '4.4 SP NW + PRIORAT', priority: 43, match: (b) => b.country === 'Spain' },

  // France (Champagne already handled by the sparkling rules)
  { id: 'bdx-lb', binId: '2.7 BDX LB', priority: 40, match: (b) => b.country === 'France' && b.region.includes('Bordeaux') && !isSweet(b) && ['Médoc', 'Graves'].includes(b.subRegion ?? '') },
  { id: 'bdx-rb', binId: '2.8 BDX RB', priority: 39, match: (b) => b.country === 'France' && b.region.includes('Bordeaux') && !isSweet(b) && b.subRegion === 'Libournais' },
  { id: 'bourgogne', binId: '4.6 BOURGOGNE', priority: 38, match: (b) => b.country === 'France' && b.region === 'Burgundy' },
  { id: 'rhone', binId: '4.7 RHONE', priority: 37, match: (b) => b.country === 'France' && b.region === 'Rhône' },
  { id: 'jura', binId: '4.8 JURA', priority: 36, match: (b) => b.country === 'France' && b.region === 'Jura' },
  { id: 'fr-other', binId: '3.8 FR OTHER', priority: 35, match: (b) => b.country === 'France' },

  // Germany + Austria
  { id: 'de-mosel-a-e', binId: '5.1 DE MOSEL + NAHE A–E', priority: 30, match: (b) => b.country === 'Germany' && ['Mosel Saar Ruwer', 'Nahe'].includes(b.region) && inRange(b.producer, 'a', 'e') },
  { id: 'de-mosel-f-z', binId: '5.2 DE MOSEL + NAHE F–Z', priority: 29, match: (b) => b.country === 'Germany' && ['Mosel Saar Ruwer', 'Nahe'].includes(b.region) },
  { id: 'de-other-a-q', binId: '5.3 DE OTHER A–Q + AT', priority: 28, match: (b) => b.country === 'Austria' || (b.country === 'Germany' && inRange(b.producer, 'a', 'q')) },
  { id: 'de-other-r-z', binId: '5.4 DE OTHER R–Z', priority: 27, match: (b) => b.country === 'Germany' },

  // USA + New World
  { id: 'saxum', binId: '5.5 SAXUM', priority: 20, match: (b) => b.country === 'USA' && b.producer.includes('Saxum') },
  { id: 'napa', binId: '5.6 NAPA', priority: 19, match: (b) => b.country === 'USA' && b.subRegion === 'Napa Valley' },
  { id: 'usa-other', binId: '5.7 USA OTHER', priority: 18, match: (b) => b.country === 'USA' },
  { id: 'new-world', binId: '5.8 NEW WORLD', priority: 17, match: (b) => NEW_WORLD.includes(b.country) },

  // Anything else: the shelf with the most room in the newest cabinet.
  { id: 'fallback', binId: '5.8 NEW WORLD', priority: 1, match: () => true },
]

export const layoutRules: BinRule[] = SPECS.map((s) => ({
  id: `remote/${s.id}`,
  name: s.binId,
  priority: s.priority,
  location: 'REMOTE',
  binId: s.binId,
  overflowBinId: null,
  match: s.match,
}))
