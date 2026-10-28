import type { Bottle } from '../../rules/types'

// Home layout (2026-11). The cabinet in the flat (Lgh) has seven shelves:
// six with movable rows of 12 bottles (as set up 2026-10-28: 3, 2, 2, 2, 3, 2
// rows from the top) and a fixed 18 at the bottom. Källaren (Kall) has
// five shelves of 36 and 20 at the bottom. Every shelf keeps HOME_MARGIN
// places free. Each category fills its cabinet shelf with the earliest
// drinking windows first, then its Källaren shelves; what does not fit goes
// to external storage, latest window first.

export type HomeCategory = 'SOTA' | 'SQN' | 'ITALIA' | 'VITA' | 'FRANKRIKE' | 'SPANIEN_USA' | 'BUBBEL'

export const HOME_MARGIN = 2

// Listed top to bottom; the number in the bin name is the shelf from the top.
export const CABINET: Record<HomeCategory, { bin: string; capacity: number }> = {
  SQN: { bin: 'Lgh 1. SQN', capacity: 36 },
  SOTA: { bin: 'Lgh 2. SOTA + STARKVIN', capacity: 24 },
  ITALIA: { bin: 'Lgh 3. ITALIA', capacity: 24 },
  FRANKRIKE: { bin: 'Lgh 4. FRANKRIKE', capacity: 24 },
  VITA: { bin: 'Lgh 5. VITA', capacity: 36 },
  SPANIEN_USA: { bin: 'Lgh 6. SPANIEN, USA + OVRIGT', capacity: 24 },
  BUBBEL: { bin: 'Lgh 7. BUBBEL', capacity: 18 },
}

// Top to bottom. A category spills onto its shelves in the listed order.
export const CELLAR_SHELVES: { bin: string; capacity: number; categories: HomeCategory[] }[] = [
  { bin: 'Kall 1. ITALIA', capacity: 36, categories: ['ITALIA'] },
  { bin: 'Kall 2. ITALIA + BUBBEL', capacity: 36, categories: ['ITALIA', 'BUBBEL', 'SOTA', 'SQN'] },
  { bin: 'Kall 3. FRANKRIKE', capacity: 36, categories: ['FRANKRIKE'] },
  { bin: 'Kall 4. SPANIEN, USA + OVRIGT', capacity: 36, categories: ['SPANIEN_USA'] },
  { bin: 'Kall 5. VITA', capacity: 36, categories: ['VITA'] },
  { bin: 'Kall 6. VITA', capacity: 20, categories: ['VITA'] },
]

// Cabinet shelf names before 2026-11, by the category that now owns that
// content. A bottle still on one of these is already in the cabinet.
const LEGACY_CABINET: Record<string, HomeCategory[]> = {
  'Lgh 1. ITALIA': ['ITALIA'],
  'Lgh 2. FRANKRIKE': ['FRANKRIKE'],
  'Lgh 3. SPANIEN + OVRIGT': ['SPANIEN_USA'],
  'Lgh 4. USA': ['SPANIEN_USA', 'SQN'],
  'Lgh 5. BUBBEL': ['BUBBEL'],
  'Lgh 6. VITA': ['VITA', 'SQN'],
  'Lgh 7. SOTA + STARKVIN': ['SOTA'],
}

/** Is this bottle already in the cabinet, on its category's shelf (old or new name)? */
export function isOnCabinetShelf(currentBin: string | null | undefined, c: HomeCategory): boolean {
  if (currentBin == null) return false
  return currentBin === CABINET[c].bin || (LEGACY_CABINET[currentBin] ?? []).includes(c)
}

/** Shelf space a bottle takes: magnum 2, 3 L 4, half bottles and 500 ml 2/3. */
export function placesFor(size: string | null | undefined): number {
  switch (size) {
    case '1.5L': return 2
    case '3.0L': return 4
    case '187ml':
    case '375ml':
    case '500ml':
    case '620ml':
      return 2 / 3
    default: return 1
  }
}

export function homeCategory(b: Bottle): HomeCategory {
  const wt = b.wineType ?? ''
  if (wt.includes('Sweet') || wt.includes('Dessert') || wt.includes('Fortified')) return 'SOTA'
  if (b.producer.includes('Sine Qua Non')) return 'SQN'
  if (wt.includes('Sparkling')) return 'BUBBEL'
  if (wt === 'Orange' || wt.startsWith('White')) return 'VITA'
  if (b.country === 'Italy') return 'ITALIA'
  if (b.country === 'France') return 'FRANKRIKE'
  return 'SPANIEN_USA'
}

export const HOME_LAYOUT_BINS: string[] = [
  ...Object.values(CABINET).map((s) => s.bin),
  ...CELLAR_SHELVES.map((s) => s.bin),
]
