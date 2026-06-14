import { memo } from 'react'
import type { ScoredBottle } from '../search/types'
import { moveType, actionLabel } from '../data/models'
import { displayVintage, displayCost } from '../data/format'

interface Props {
  result: ScoredBottle
  onDone: (barcode: string) => void
  onUndo?: (barcode: string) => void
}

function ctUrl(iwine: number): string {
  return `https://www.cellartracker.com/wine.asp?iWine=${iwine}`
}

export const SearchResultCard = memo(function SearchResultCard({ result, onDone, onUndo }: Props) {
  const { bottle, tier } = result
  const mt = moveType(bottle)
  const canAct = tier === 'needs-action'

  const verdictClass = mt === 'cross-location' ? 'search-card--move'
    : mt === 'within-location' ? 'search-card--rebin'
    : bottle.recommended_bin ? 'search-card--home-placed'
    : 'search-card--home'

  const locationPrefix = bottle.recommended_location === 'REMOTE' ? 'REMOTE ' : ''
  const verdictText = (mt === 'cross-location' || mt === 'within-location')
    ? `MOVE TO ${locationPrefix}${bottle.recommended_bin ?? 'TBD'}`
    : bottle.recommended_bin ? `IN PLACE ${bottle.recommended_bin}`
    : 'HOME'

  const currentBin = bottle.current_bin ?? bottle.current_location ?? 'Unknown'

  const handleDone = (e: React.MouseEvent) => {
    e.stopPropagation()
    onDone(bottle.barcode)
  }

  const handleUndo = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onUndo) onUndo(bottle.barcode)
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
          {(mt === 'cross-location' || mt === 'within-location') && (
            <div className="search-card__current">Currently: {currentBin}</div>
          )}
        </div>
        {canAct && (
          <button className="search-card__action" onClick={handleDone}>
            {actionLabel(bottle)}
          </button>
        )}
        {!canAct && (bottle.state === 'packed' || bottle.state === 'in_transit') && onUndo && (
          <button className="search-card__action search-card__action--undo" onClick={handleUndo}>
            Undo
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
