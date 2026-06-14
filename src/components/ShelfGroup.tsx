import type { DbBottle } from '../data/models'
import { needsMove } from '../data/models'
import { BottleCard } from './BottleCard'
import { OwcGroupCard } from './OwcGroupCard'
import { groupByOwc } from '../hooks/useBottles'

interface Props {
  shelfName: string
  bottles: DbBottle[]
  capacity?: { current: number; max: number }
  onDone: (barcode: string) => void
  onBatchDone: (barcodes: string[]) => void
  onUndo?: (barcode: string) => void
}

export function ShelfGroup({ shelfName, bottles, capacity, onDone, onBatchDone, onUndo }: Props) {
  const { owc, loose } = groupByOwc(bottles)
  const total = bottles.length
  const done = bottles.filter((b) => b.state === 'shelved' || b.state === 'synced').length

  const actionable = bottles.filter((b) => needsMove(b) && (b.state === 'pending' || b.state === 'packed' || b.state === 'in_transit'))
  const allActionable = actionable.length === total && total > 0

  const isRemote = bottles.some((b) => b.recommended_location === 'REMOTE')
  const groupClass = isRemote ? 'shelf-group--remote' : 'shelf-group--local'
  const locationLabel = isRemote ? 'EXTERN' : 'HEMMA'

  return (
    <section className={`shelf-group ${groupClass}`} data-testid={`shelf-${shelfName}`}>
      <div className="shelf-group__header">
        <div className="shelf-group__title">
          <span className="shelf-group__location-badge">{locationLabel}</span>
          <span className="shelf-group__name">→ {shelfName}</span>
          <span className="shelf-group__count">{total} fl</span>
        </div>

        {capacity && (
          <div className="shelf-group__capacity">
            <div
              className="shelf-group__capacity-bar"
              style={{ width: `${Math.min(100, (capacity.current / capacity.max) * 100)}%` }}
              role="progressbar"
              aria-valuenow={capacity.current}
              aria-valuemax={capacity.max}
            />
            <span className="shelf-group__capacity-label">{capacity.current}/{capacity.max}</span>
          </div>
        )}

        <div className="shelf-group__progress">
          <div
            className="shelf-group__progress-bar"
            style={{ width: `${total > 0 ? (done / total) * 100 : 0}%` }}
          />
          <span>{done}/{total}</span>
        </div>

        {allActionable && (
          <button
            className="shelf-group__batch-action"
            onClick={() => onBatchDone(bottles.map((b) => b.barcode))}
            data-testid={`batch-${shelfName}`}
          >
            Done All ▸
          </button>
        )}
      </div>

      <div className="shelf-group__bottles">
        {[...owc.entries()].map(([groupName, groupBottles]) => (
          <OwcGroupCard
            key={groupName}
            groupName={groupName}
            bottles={groupBottles}
            onDoneAll={onBatchDone}
          />
        ))}
        {loose.map((b) => (
          <BottleCard key={b.barcode} bottle={b} onDone={onDone} onUndo={onUndo} />
        ))}
      </div>
    </section>
  )
}
