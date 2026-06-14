export const REMOTE_BINS = [
  '1.1 OWC', '1.2 OWC', '1.3 SQN REGULAR', '1.4 SQN EC + NoK',
  '1.5 NAPA', '1.6 CALIFORNIA OTHER', '1.7 NW + SP OTHER', '1.8 CASTILLA',
  '2.1 BDX LB', '2.2 BDX RB', '2.3 RHONE N', '2.4 RHONE S',
  '2.5 CHAMPAGNE', '2.6 FR OTHER', '2.7 DE MOSEL', '2.8 DE OTHER',
  '3.1 PIEMONTE PRESTIGE', '3.2 BAROLO MODERN', '3.3 BAROLO CLASSIC',
  '3.4 BARBARESCO', '3.5 TOSCANA', '3.6 SICILIEN', '3.7 IT OTHER',
] as const

export const HOME_BINS = [
  'Lgh 1. ITALIA', 'Lgh 2. FRANKRIKE', 'Lgh 3. SPANIEN + OVRIGT',
  'Lgh 4. USA', 'Lgh 5. BUBBEL', 'Lgh 6. VITA',
  'Kall 1. ITALIA', 'Kall 2. FRANKRIKE', 'Kall 3. SPANIEN + OVRIGT',
  'Kall 4. USA', 'Kall 5. BUBBEL + VITA', 'Kall 6. OVRIGT',
  'Cooler',
] as const

export function allBinsGrouped(): { label: string; bins: string[] }[] {
  return [
    { label: 'Extern (Skap 1)', bins: REMOTE_BINS.filter(b => b.startsWith('1.')) as unknown as string[] },
    { label: 'Extern (Skap 2)', bins: REMOTE_BINS.filter(b => b.startsWith('2.')) as unknown as string[] },
    { label: 'Extern (Skap 3)', bins: REMOTE_BINS.filter(b => b.startsWith('3.')) as unknown as string[] },
    { label: 'Lagringsskåp', bins: HOME_BINS.filter(b => b.startsWith('Lgh')) as unknown as string[] },
    { label: 'Källaren', bins: HOME_BINS.filter(b => b.startsWith('Kall')) as unknown as string[] },
    { label: 'Cooler', bins: ['Cooler'] },
  ]
}
