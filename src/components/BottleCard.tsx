import type { DbBottle } from '../data/models'
import { needsMove, actionLabel } from '../data/models'
import { displayVintage, displayCost } from '../data/format'

interface Props {
  bottle: DbBottle
  onDone: (barcode: string) => void
}

const STATE_STYLES: Record<string, string> = {
  pending: 'bottle-card--pending',
  packed: 'bottle-card--packed',
  in_transit: 'bottle-card--packed',
  shelved: 'bottle-card--shelved',
  synced: 'bottle-card--synced',
}

function ctUrl(iwine: number): string {
  return `https://www.cellartracker.com/wine.asp?iWine=${iwine}`
}

function stateExplanation(state: string): string | null {
  if (state === 'shelved' || state === 'synced') return 'Already placed'
  if (state === 'packed' || state === 'in_transit') return 'Packed, awaiting transport'
  return null
}

export function BottleCard({ bottle, onDone }: Props) {
  const moves = needsMove(bottle)

  const canAct = moves && (
    (bottle.state === 'pending') ||
    (bottle.state === 'packed') ||
    (bottle.state === 'in_transit')
  )

  const stateClass = STATE_STYLES[bottle.state] ?? ''
  const sizeLabel = bottle.size !== '750ml' ? bottle.size : null
  const explanation = !canAct ? stateExplanation(bottle.state) : null

  const handleClick = () => {
    if (canAct) onDone(bottle.barcode)
  }

  const handleCtLink = (e: React.MouseEvent) => {
    e.stopPropagation()
  }

  return (
    <div
      className={`bottle-card ${stateClass} ${canAct ? '' : 'bottle-card--disabled'}`}
      onClick={handleClick}
      data-testid={`bottle-${bottle.barcode}`}
    >
      <div className="bottle-card__state">
        {bottle.state === 'pending' && '○'}
        {(bottle.state === 'packed' || bottle.state === 'in_transit') && '◐'}
        {(bottle.state === 'shelved' || bottle.state === 'synced') && '✓'}
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
            <span className="bottle-card__dest">→ {bottle.recommended_location === 'REMOTE' ? 'REMOTE ' : ''}{bottle.recommended_bin}</span>
          )}
        </div>
        {explanation && (
          <div className="bottle-card__explanation">{explanation}</div>
        )}
      </div>
      {canAct && (
        <button className="bottle-card__done-btn" onClick={(e) => { e.stopPropagation(); onDone(bottle.barcode) }}>
          {actionLabel(bottle)}
        </button>
      )}
    </div>
  )
}
