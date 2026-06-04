import { useState, useMemo, useDeferredValue, useRef, useEffect, useCallback } from 'react'
import { SearchIndex } from '../search/SearchIndex'
import { SearchResultCard } from './SearchResultCard'
import type { DbBottle } from '../data/models'
import type { Mode, TieredResults } from '../search/types'

interface Props {
  bottles: DbBottle[]
  mode: Mode
  onPack: (barcode: string) => void
}

const TIER3_CAP = 5
const EMPTY: TieredResults = { needsAction: [], inProgress: [], noMove: [], total: 0 }

export function SearchPanel({ bottles, mode, onPack }: Props) {
  const [query, setQuery] = useState('')
  const [toast, setToast] = useState<string | null>(null)
  const [showAllNoMove, setShowAllNoMove] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const index = useMemo(() => new SearchIndex(bottles), [bottles])
  const results = useMemo(() => query.trim() ? index.search(query, mode) : EMPTY, [index, query, mode])
  const deferred = useDeferredValue(results)
  const isStale = results !== deferred

  useEffect(() => { setShowAllNoMove(false) }, [query])

  const handlePack = useCallback((barcode: string) => {
    const bottle = bottles.find(b => b.barcode === barcode)
    onPack(barcode)

    if (bottle) {
      setToast(`${bottle.vintage} ${bottle.wine} — packed`)
      setTimeout(() => setToast(null), 2000)
    }

    setTimeout(() => {
      setQuery('')
      inputRef.current?.focus()
    }, 300)
  }, [bottles, onPack])

  const noMoveVisible = showAllNoMove ? deferred.noMove : deferred.noMove.slice(0, TIER3_CAP)
  const noMoveHidden = deferred.noMove.length - noMoveVisible.length

  return (
    <div className="search-panel">
      <div className="search-panel__bar">
        <input
          ref={inputRef}
          type="text"
          className="search-panel__input"
          placeholder="Search wines..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
        />
        {query && (
          <button className="search-panel__clear" onClick={() => { setQuery(''); inputRef.current?.focus() }}>
            ×
          </button>
        )}
      </div>

      {query.trim() && (
        <div className="search-panel__results" style={{ opacity: isStale ? 0.7 : 1 }}>
          {deferred.total === 0 && (
            <div className="search-panel__empty">No bottles match "{query}"</div>
          )}

          {deferred.needsAction.length > 0 && (
            <div className="search-panel__tier">
              <div className="search-panel__tier-header">NEEDS ACTION ({deferred.needsAction.length})</div>
              {deferred.needsAction.map((r) => (
                <SearchResultCard key={r.bottle.barcode} result={r} onPack={handlePack} />
              ))}
            </div>
          )}

          {deferred.inProgress.length > 0 && (
            <div className="search-panel__tier search-panel__tier--muted">
              <div className="search-panel__tier-header">IN PROGRESS ({deferred.inProgress.length})</div>
              {deferred.inProgress.map((r) => (
                <SearchResultCard key={r.bottle.barcode} result={r} onPack={handlePack} />
              ))}
            </div>
          )}

          {deferred.noMove.length > 0 && (
            <div className="search-panel__tier search-panel__tier--dim">
              <div className="search-panel__tier-header">NO MOVE NEEDED ({deferred.noMove.length})</div>
              {noMoveVisible.map((r) => (
                <SearchResultCard key={r.bottle.barcode} result={r} onPack={handlePack} />
              ))}
              {noMoveHidden > 0 && (
                <button className="search-panel__show-more" onClick={() => setShowAllNoMove(true)}>
                  {noMoveHidden} more — no move needed
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {toast && (
        <div className="search-panel__toast">{toast}</div>
      )}
    </div>
  )
}
