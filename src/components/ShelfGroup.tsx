import type { DbBottle } from '../data/models'
import { BottleCard } from './BottleCard'
import { OwcGroupCard } from './OwcGroupCard'
import { groupByOwc } from '../hooks/useBottles'

interface Props {
  shelfName: string
  bottles: DbBottle[]
  mode: 'packing' | 'unpacking'
  capacity?: { current: number; max: number }
  onAction: (barcode: string) => void
  onBatchAction: (barcodes: string[]) => void
  onRebin?: (barcode: string) => void
}

export function ShelfGroup({ shelfName, bottles, mode, capacity, onAction, onBatchAction, onRebin }: Props) {
  const { owc, loose } = groupByOwc(bottles)
  const total = bottles.length
  const done = bottles.filter((b) =>
    mode === 'packing' ? b.state !== 'pending' : b.state === 'shelved' || b.state === 'synced',
  ).length

  const allActionable = mode === 'packing'
    ? bottles.every((b) => b.state === 'pending')
    : bottles.every((b) => b.state === 'packed' || b.state === 'in_transit')

  return (
    <section className="shelf-group" data-testid={`shelf-${shelfName}`}>
      <div className="shelf-group__header">
        <div className="shelf-group__title">
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
            onClick={() => onBatchAction(bottles.map((b) => b.barcode))}
            data-testid={`batch-${shelfName}`}
          >
            {mode === 'packing' ? 'Pack All ▸' : 'Shelve All ▸'}
          </button>
        )}
      </div>

      <div className="shelf-group__bottles">
        {[...owc.entries()].map(([groupName, groupBottles]) => (
          <OwcGroupCard
            key={groupName}
            groupName={groupName}
            bottles={groupBottles}
            mode={mode}
            onActionAll={onBatchAction}
          />
        ))}
        {loose.map((b) => (
          <BottleCard key={b.barcode} bottle={b} mode={mode} onAction={onAction} onRebin={onRebin} />
        ))}
      </div>
    </section>
  )
}
