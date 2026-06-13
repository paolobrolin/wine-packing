import { memo } from 'react'
import type { ScoredBottle, Mode } from '../search/types'
import { needsMove, moveType } from '../data/models'
import { displayVintage, displayCost } from '../data/format'

interface Props {
  result: ScoredBottle
  mode: Mode
  onPack: (barcode: string) => void
  onShelve?: (barcode: string) => void
  onUnpack?: (barcode: string) => void
  onRebin?: (barcode: string) => void
}

function ctUrl(iwine: number): string {
  return `https://www.cellartracker.com/wine.asp?iWine=${iwine}`
}

export const SearchResultCard = memo(function SearchResultCard({ result, mode, onPack, onShelve, onUnpack, onRebin }: Props) {
  const { bottle, tier } = result
  const mt = moveType(bottle)
  const moves = needsMove(bottle)
  const canAct = tier === 'needs-action'
  const canUndo = tier === 'in-progress' && bottle.state === 'packed'

  const verdictClass = mt === 'cross-location' ? 'search-card--move'
    : mt === 'within-location' ? 'search-card--rebin'
    : bottle.recommended_bin ? 'search-card--home-placed'
    : 'search-card--home'

  const verdictText = mt === 'cross-location' ? `MOVE → ${bottle.recommended_bin ?? 'TBD'}`
    : mt === 'within-location' ? `REBIN → ${bottle.recommended_bin ?? 'TBD'}`
    : bottle.recommended_bin ? `HOME → ${bottle.recommended_bin}`
    : 'STAYS HOME'

  const handleAction = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (mt === 'within-location' && onRebin) {
      onRebin(bottle.barcode)
      return
    }
    if (canAct) {
      if (mode === 'unpacking' && onShelve) onShelve(bottle.barcode)
      else onPack(bottle.barcode)
    } else if (canUndo && onUnpack) {
      onUnpack(bottle.barcode)
    }
  }

  const handleCtLink = (e: React.MouseEvent) => {
    e.stopPropagation()
  }

  const actionLabel = mt === 'within-location' ? 'Move'
    : mode === 'unpacking' ? 'Shelve' : 'Pack'

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
        {(canAct || (mt === 'within-location' && bottle.state === 'pending')) && (
          <button className={`search-card__action${mt === 'within-location' ? ' search-card__action--rebin' : ''}`} onClick={handleAction}>
            {actionLabel}
          </button>
        )}
        {canUndo && (
          <button className="search-card__action search-card__action--undo" onClick={handleAction}>
            Undo
          </button>
        )}
      </div>
    </div>
  )
}, (prev, next) =>
  prev.result.bottle.barcode === next.result.bottle.barcode &&
  prev.result.bottle.state === next.result.bottle.state &&
  prev.result.tier === next.result.tier &&
  prev.mode === next.mode
)
