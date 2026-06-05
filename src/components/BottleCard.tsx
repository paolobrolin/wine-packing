import type { DbBottle } from '../data/models'
import { displayVintage, displayCost } from '../data/format'

interface Props {
  bottle: DbBottle
  mode: 'packing' | 'unpacking'
  onAction: (barcode: string) => void
}

const STATE_STYLES: Record<string, string> = {
  pending: 'bottle-card--pending',
  packed: 'bottle-card--packed',
  in_transit: 'bottle-card--transit',
  shelved: 'bottle-card--shelved',
  synced: 'bottle-card--synced',
}

function ctUrl(iwine: number): string {
  return `https://www.cellartracker.com/wine.asp?iWine=${iwine}`
}

export function BottleCard({ bottle, mode, onAction }: Props) {
  const canAct =
    (mode === 'packing' && bottle.state === 'pending') ||
    (mode === 'unpacking' && (bottle.state === 'in_transit' || bottle.state === 'packed'))
  const canUndo =
    (mode === 'packing' && bottle.state === 'packed')
  const actionable = canAct || canUndo

  const stateClass = STATE_STYLES[bottle.state] ?? ''
  const sizeLabel = bottle.size !== '750ml' ? bottle.size : null

  const handleClick = () => {
    if (actionable) onAction(bottle.barcode)
  }

  const handleCtLink = (e: React.MouseEvent) => {
    e.stopPropagation()
  }

  return (
    <div
      className={`bottle-card ${stateClass} ${actionable ? '' : 'bottle-card--disabled'}`}
      onClick={handleClick}
      data-testid={`bottle-${bottle.barcode}`}
    >
      <div className="bottle-card__state">
        {bottle.state === 'pending' && '○'}
        {bottle.state === 'packed' && '●'}
        {bottle.state === 'in_transit' && '◉'}
        {bottle.state === 'shelved' && '✓'}
        {bottle.state === 'synced' && '✓'}
      </div>
      <div className="bottle-card__info">
        <div className="bottle-card__name">
          <a
            href={ctUrl(bottle.iwine)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleCtLink}
            className="bottle-card__ct-link"
          >
            {displayVintage(bottle.vintage)} {bottle.wine}
          </a>
          {sizeLabel && <span className="bottle-card__size">{sizeLabel}</span>}
        </div>
        <div className="bottle-card__meta">
          {displayCost(bottle.cost, bottle.cost_currency) && <span>{displayCost(bottle.cost, bottle.cost_currency)}</span>}
          {bottle.begin_consume && bottle.end_consume && (
            <span className="bottle-card__window">{bottle.begin_consume}–{bottle.end_consume}</span>
          )}
          {bottle.recommended_bin && (
            <span className="bottle-card__dest">→ {bottle.recommended_bin}</span>
          )}
        </div>
        {bottle.move_reason && (
          <div className="bottle-card__reason">{bottle.move_reason}</div>
        )}
      </div>
    </div>
  )
}
