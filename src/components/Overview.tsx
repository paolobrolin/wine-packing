import type { DbBottle } from '../data/models'
import { isOverdue } from '../data/models'
import { ProgressBar } from './ProgressBar'
import { groupBySource } from '../hooks/useBottles'

interface Props {
  bottles: DbBottle[]
  onSelectSource: (source: string) => void
  onShowPacked?: () => void
}

export function Overview({ bottles, onSelectSource, onShowPacked }: Props) {
  const total = bottles.length
  const done = bottles.filter((b) => b.state === 'shelved' || b.state === 'synced').length
  const packed = bottles.filter((b) => b.state === 'packed').length
  const inTransit = bottles.filter((b) => b.state === 'in_transit').length
  const overdue = bottles.filter((b) => isOverdue(b, new Date())).length

  const sources = groupBySource(bottles)

  return (
    <div className="overview">
      <div className="overview__summary">
        <h2 className="overview__title">{total - done} bottles to move</h2>
        <ProgressBar current={done} total={total} />
        {packed > 0 && (
          <button className="overview__stat overview__stat--link" onClick={onShowPacked}>
            📦 {packed} packed, awaiting transport →
          </button>
        )}
        {inTransit > 0 && <div className="overview__stat">{inTransit} in transit</div>}
      </div>

      {overdue > 0 && (
        <div className="overview__warning" role="alert">
          ⚠ {overdue} bottle{overdue > 1 ? 's' : ''} in transit &gt;2h
        </div>
      )}

      <div className="overview__sources">
        {[...sources.entries()].map(([source, sourceBottles]) => {
          const sourceDone = sourceBottles.filter((b) => b.state === 'shelved' || b.state === 'synced').length
          const sourcePacked = sourceBottles.filter((b) => b.state === 'packed').length
          return (
            <button
              key={source}
              className="overview__source-card"
              onClick={() => onSelectSource(source)}
              data-testid={`source-${source}`}
            >
              <div className="overview__source-name">{source}</div>
              <ProgressBar current={sourceDone} total={sourceBottles.length} />
              <div className="overview__source-stats">
                {sourceBottles.length - sourceDone} pending
                {sourcePacked > 0 && ` · ${sourcePacked} packed`}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
