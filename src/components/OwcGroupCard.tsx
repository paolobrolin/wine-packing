import { useState } from 'react'
import type { DbBottle } from '../data/models'

interface Props {
  groupName: string
  bottles: DbBottle[]
  mode: 'packing' | 'unpacking'
  onActionAll: (barcodes: string[]) => void
}

export function OwcGroupCard({ groupName, bottles, mode, onActionAll }: Props) {
  const [expanded, setExpanded] = useState(false)

  const allPending = bottles.every((b) => b.state === 'pending')
  const allPacked = bottles.every((b) => b.state === 'packed' || b.state === 'in_transit')
  const allShelved = bottles.every((b) => b.state === 'shelved' || b.state === 'synced')

  const actionable =
    (mode === 'packing' && allPending) ||
    (mode === 'unpacking' && allPacked)

  const stateClass = allShelved ? 'owc-card--shelved' : allPacked ? 'owc-card--packed' : 'owc-card--pending'
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
          onClick={() => onActionAll(barcodes)}
          data-testid={`owc-action-${groupName}`}
        >
          {mode === 'packing' ? 'Pack Case ▸' : 'Shelve Case ▸'}
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
              {b.state === 'shelved' ? '✓' : '○'} {b.vintage} {b.wine}
              {b.size !== '750ml' && <span className="owc-card__size">{b.size}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
