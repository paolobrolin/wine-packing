import type { DbBottle } from '../data/models'
import { needsMove } from '../data/models'
import type { Mode, Tier, ScoredBottle, TieredResults } from './types'
import { SEARCH_FIELDS } from './types'

interface IndexedBottle {
  bottle: DbBottle
  fields: Map<string, string[]>
}

function tokenize(value: string): string[] {
  return value.toLowerCase().split(/\s+/).filter(Boolean)
}

function classifyTier(bottle: DbBottle, mode: Mode): Tier {
  const moves = needsMove(bottle)
  if (mode === 'packing') {
    if (moves && bottle.state === 'pending') return 'needs-action'
    if (moves && (bottle.state === 'packed' || bottle.state === 'in_transit')) return 'in-progress'
    return 'no-move'
  }
  if (bottle.state === 'in_transit' || bottle.state === 'packed') return 'needs-action'
  if (bottle.state === 'shelved') return 'in-progress'
  return 'no-move'
}

function actionScore(tier: Tier): number {
  if (tier === 'needs-action') return 10
  if (tier === 'in-progress') return 5
  return 0
}

export class SearchIndex {
  private entries: IndexedBottle[]

  constructor(bottles: DbBottle[]) {
    this.entries = bottles.map((bottle) => {
      const fields = new Map<string, string[]>()
      for (const f of SEARCH_FIELDS) {
        const val = bottle[f.key]
        if (val != null) {
          fields.set(f.key, tokenize(String(val)))
        }
      }
      return { bottle, fields }
    })
  }

  search(query: string, mode: Mode): TieredResults {
    const trimmed = query.trim()
    if (!trimmed) return { needsAction: [], inProgress: [], noMove: [], total: 0 }

    const terms = trimmed.toLowerCase().split(/\s+/)
    const scored: ScoredBottle[] = []

    for (const entry of this.entries) {
      const relevance = this.scoreEntry(entry, terms)
      if (relevance === 0) continue

      const tier = classifyTier(entry.bottle, mode)
      const score = relevance * 100 + actionScore(tier)

      scored.push({ bottle: entry.bottle, score, tier })
    }

    scored.sort((a, b) => b.score - a.score)

    const needsAction: ScoredBottle[] = []
    const inProgress: ScoredBottle[] = []
    const noMove: ScoredBottle[] = []

    for (const s of scored) {
      if (s.tier === 'needs-action') needsAction.push(s)
      else if (s.tier === 'in-progress') inProgress.push(s)
      else noMove.push(s)
    }

    return { needsAction, inProgress, noMove, total: scored.length }
  }

  private scoreEntry(entry: IndexedBottle, terms: string[]): number {
    let total = 0

    for (const term of terms) {
      let bestFieldScore = 0

      for (const field of SEARCH_FIELDS) {
        const tokens = entry.fields.get(field.key)
        if (!tokens) continue

        for (const token of tokens) {
          if (field.prefix && token.startsWith(term)) {
            bestFieldScore = Math.max(bestFieldScore, field.weight * 2)
          } else if (token.includes(term)) {
            bestFieldScore = Math.max(bestFieldScore, field.weight)
          }
        }
      }

      if (bestFieldScore === 0) return 0
      total += bestFieldScore
    }

    return total
  }
}
