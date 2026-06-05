import { memo } from 'react'
import type { ScoredBottle } from '../search/types'
import { needsMove } from '../data/models'
import { displayVintage, displayCost } from '../data/format'

interface Props {
  result: ScoredBottle
  onPack: (barcode: string) => void
}

function ctUrl(iwine: number): string {
  return `https://www.cellartracker.com/wine.asp?iWine=${iwine}`
}

export const SearchResultCard = memo(function SearchResultCard({ result, onPack }: Props) {
  const { bottle, tier } = result
  const moves = needsMove(bottle)
  const actionable = tier === 'needs-action'

  const verdictClass = moves ? 'search-card--move' : 'search-card--home'
  const verdictText = moves
    ? `MOVE → ${bottle.recommended_bin ?? 'TBD'}`
    : 'STAYS HOME'

  const handlePack = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (actionable) onPack(bottle.barcode)
  }

  const handleCtLink = (e: React.MouseEvent) => {
    e.stopPropagation()
  }

  return (
    <div className={`search-card ${verdictClass}`} data-testid={`search-${bottle.barcode}`}>
      <div className="search-card__verdict">{verdictText}</div>
      <div className="search-card__body">
        <div className="search-card__info">
          <a
            href={ctUrl(bottle.iwine)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleCtLink}
            className="search-card__name"
          >
            {displayVintage(bottle.vintage)} {bottle.wine}
          </a>
          {bottle.size !== '750ml' && <span className="search-card__size">{bottle.size}</span>}
          <div className="search-card__meta">
            {displayCost(bottle.cost, bottle.cost_currency) && <span>{displayCost(bottle.cost, bottle.cost_currency)}</span>}
            {bottle.begin_consume && bottle.end_consume && (
              <span className="search-card__window">{bottle.begin_consume}–{bottle.end_consume}</span>
            )}
          </div>
        </div>
        {actionable && (
          <button className="search-card__action" onClick={handlePack}>
            Pack
          </button>
        )}
      </div>
    </div>
  )
}, (prev, next) =>
  prev.result.bottle.barcode === next.result.bottle.barcode &&
  prev.result.bottle.state === next.result.bottle.state &&
  prev.result.tier === next.result.tier
)
