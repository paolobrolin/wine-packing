export const REMOTE_BINS = [
  '1.1 OWC', '1.2 OWC SINGLES', '1.3 SQN GRENACHE + NOK', '1.4 SQN SYRAH',
  '2.1 BAROLO A–E', '2.2 BAROLO F–K', '2.3 BAROLO L–O', '2.4 BAROLO P–Q',
  '2.5 BAROLO R–Z + LANGHE', '2.6 PIEMONTE WHITE', '2.7 BDX LB', '2.8 BDX RB',
  '3.1 BARBARESCO', '3.2 BARBARESCO PDB', '3.3 TOSCANA MONTALCINO', '3.4 TOSCANA A–H',
  '3.5 TOSCANA I–Z', '3.6 SPARKLING A–K', '3.7 SPARKLING L–Z', '3.8 FR OTHER',
  '4.1 SICILIA A–P', '4.2 SICILIA Q–Z + IT OTHER', '4.3 SP DUERO + GREECE', '4.4 SP NW + PRIORAT',
  '4.5 SP RIOJA', '4.6 BOURGOGNE', '4.7 RHONE', '4.8 JURA',
  '5.1 DE MOSEL + NAHE A–E', '5.2 DE MOSEL + NAHE F–Z', '5.3 DE OTHER A–Q + AT', '5.4 DE OTHER R–Z',
  '5.5 SAXUM', '5.6 NAPA', '5.7 USA OTHER', '5.8 NEW WORLD',
] as const

// Bins of the layout before 2026-11. Bottles still carry these in CT until
// they are moved, and they are still at REMOTE meanwhile.
export const LEGACY_REMOTE_BINS = [
  '1.1 OWC', '1.2 OWC', '1.3 SQN REGULAR', '1.4 SQN EC + NoK',
  '1.5 NAPA', '1.6 CALIFORNIA OTHER', '1.7 NW + SP OTHER', '1.8 CASTILLA',
  '2.1 BDX LB', '2.2 BDX RB', '2.3 RHONE N', '2.4 RHONE S',
  '2.5 CHAMPAGNE', '2.6 FR OTHER', '2.7 DE MOSEL', '2.8 DE OTHER',
  '3.1 PIEMONTE PRESTIGE', '3.2 BAROLO MODERN', '3.3 BAROLO CLASSIC',
  '3.4 BARBARESCO', '3.5 TOSCANA', '3.6 SICILIEN', '3.7 IT OTHER',
  '4.0 OSORTERAT',
] as const

export function isRemoteBin(bin: string): boolean {
  return (REMOTE_BINS as readonly string[]).includes(bin) || (LEGACY_REMOTE_BINS as readonly string[]).includes(bin)
}

export const HOME_BINS = [
  'Lgh 1. ITALIA', 'Lgh 2. FRANKRIKE', 'Lgh 3. SPANIEN + OVRIGT',
  'Lgh 4. USA', 'Lgh 5. BUBBEL', 'Lgh 6. VITA',
  'Lgh 7. SOTA + STARKVIN',
  'Kall 1. ITALIA', 'Kall 2. FRANKRIKE', 'Kall 3. SPANIEN + OVRIGT',
  'Kall 4. USA', 'Kall 5. BUBBEL + VITA', 'Kall 6. OVRIGT',
  'Kall 7. SOTA + STARKVIN',
  'Cooler',
  'Köket',
] as const

export function allBinsGrouped(): { label: string; bins: string[] }[] {
  return [
    { label: 'Extern (Skap 1)', bins: REMOTE_BINS.filter(b => b.startsWith('1.')) as unknown as string[] },
    { label: 'Extern (Skap 2)', bins: REMOTE_BINS.filter(b => b.startsWith('2.')) as unknown as string[] },
    { label: 'Extern (Skap 3)', bins: REMOTE_BINS.filter(b => b.startsWith('3.')) as unknown as string[] },
    { label: 'Extern (Skap 4)', bins: REMOTE_BINS.filter(b => b.startsWith('4.')) as unknown as string[] },
    { label: 'Extern (Skap 5)', bins: REMOTE_BINS.filter(b => b.startsWith('5.')) as unknown as string[] },
    { label: 'Lagringsskåp', bins: HOME_BINS.filter(b => b.startsWith('Lgh')) as unknown as string[] },
    { label: 'Källaren', bins: HOME_BINS.filter(b => b.startsWith('Kall')) as unknown as string[] },
    { label: 'Övrigt', bins: ['Cooler', 'Köket'] },
  ]
}
