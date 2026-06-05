import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { SearchIndex } from '../search/SearchIndex'
import { SearchResultCard } from './SearchResultCard'
import type { DbBottle } from '../data/models'
import type { Mode } from '../search/types'

interface Props {
  bottles: DbBottle[]
  mode: Mode
  onPack: (barcode: string) => void
}

const TIER3_CAP = 5

export function SearchPanel({ bottles, mode, onPack }: Props) {
  const [query, setQuery] = useState('')
  const [toast, setToast] = useState<string | null>(null)
  const [showAllNoMove, setShowAllNoMove] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const index = useMemo(() => new SearchIndex(bottles), [bottles])
  const results = useMemo(() => index.search(query, mode), [index, query, mode])

  useEffect(() => { setShowAllNoMove(false) }, [query])

  const handlePack = useCallback((barcode: string) => {
    const bottle = bottles.find(b => b.barcode === barcode)
    onPack(barcode)

    if (bottle) {
      const v = bottle.vintage === '1001' ? 'NV' : bottle.vintage
      setToast(`${v} ${bottle.wine} — packed`)
      setTimeout(() => setToast(null), 2000)
    }
  }, [bottles, onPack])

  const noMoveVisible = showAllNoMove ? results.noMove : results.noMove.slice(0, TIER3_CAP)
  const noMoveHidden = results.noMove.length - noMoveVisible.length

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

      {query.trim().length >= 2 && (
        <div className="search-panel__results">
          {results.total === 0 && (
            <div className="search-panel__empty">No bottles match "{query}"</div>
          )}

          {results.needsAction.length > 0 && (
            <div className="search-panel__tier">
              <div className="search-panel__tier-header">NEEDS ACTION ({results.needsAction.length})</div>
              {results.needsAction.map((r) => (
                <SearchResultCard key={r.bottle.barcode} result={r} onPack={handlePack} />
              ))}
            </div>
          )}

          {results.inProgress.length > 0 && (
            <div className="search-panel__tier search-panel__tier--muted">
              <div className="search-panel__tier-header">IN PROGRESS ({results.inProgress.length})</div>
              {results.inProgress.map((r) => (
                <SearchResultCard key={r.bottle.barcode} result={r} onPack={handlePack} />
              ))}
            </div>
          )}

          {results.noMove.length > 0 && (
            <div className="search-panel__tier search-panel__tier--dim">
              <div className="search-panel__tier-header">NO MOVE NEEDED ({results.noMove.length})</div>
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
