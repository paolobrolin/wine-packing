import { useState } from 'react'
import type { DbBottle } from '../data/models'

interface Props {
  groupName: string
  bottles: DbBottle[]
  onDoneAll: (barcodes: string[]) => void
}

export function OwcGroupCard({ groupName, bottles, onDoneAll }: Props) {
  const [expanded, setExpanded] = useState(false)

  const allDone = bottles.every((b) => b.state === 'shelved' || b.state === 'synced')
  const actionable = !allDone && bottles.some((b) => b.state === 'pending' || b.state === 'packed' || b.state === 'in_transit')

  const stateClass = allDone ? 'owc-card--shelved' : bottles.every((b) => b.state === 'packed' || b.state === 'in_transit') ? 'owc-card--packed' : 'owc-card--pending'
  const barcodes = bottles.map((b) => b.barcode)

  return (
    <div className={`owc-card ${stateClass}`} data-testid={`owc-${groupName}`}>
      <div className="owc-card__header">
        <span className="owc-card__icon">📦</span>
        <span className="owc-card__name">OWC: {groupName}</span>
        <span className="owc-card__count">{bottles.length} fl</span>
      </div>

      {actionable && (
        <button
          className="owc-card__action"
          onClick={() => onDoneAll(barcodes)}
          data-testid={`owc-action-${groupName}`}
        >
          Done Case ▸
        </button>
      )}

      <button
        className="owc-card__toggle"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
      >
        {expanded ? '▾ Hide bottles' : '▸ Show bottles'}
      </button>

      {expanded && (
        <ul className="owc-card__bottles">
          {bottles.map((b) => (
            <li key={b.barcode} className="owc-card__bottle">
              {(b.state === 'shelved' || b.state === 'synced') ? '✓' : (b.state === 'packed' || b.state === 'in_transit') ? '◐' : '○'} {b.vintage} {b.wine}
              {b.size !== '750ml' && <span className="owc-card__size">{b.size}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
