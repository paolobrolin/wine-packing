import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { SearchIndex } from '../search/SearchIndex'
import { SearchResultCard } from './SearchResultCard'
import type { DbBottle } from '../data/models'
import { useToast } from '../hooks/useToast'

interface Props {
  bottles: DbBottle[]
  onDone: (barcode: string) => void
  onUndo?: (barcode: string) => void
  onReset?: (barcode: string) => void
}

const TIER3_CAP = 5

export function SearchPanel({ bottles, onDone, onUndo, onReset }: Props) {
  const [query, setQuery] = useState('')
  const [showAllNoMove, setShowAllNoMove] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const { toast, show: showToast, dismiss: dismissToast } = useToast()

  const index = useMemo(() => new SearchIndex(bottles), [bottles])
  const results = useMemo(() => index.search(query), [index, query])

  useEffect(() => { setShowAllNoMove(false) }, [query])

  const handleDone = useCallback((barcode: string) => {
    const bottle = bottles.find(b => b.barcode === barcode)
    onDone(barcode)

    if (bottle) {
      const v = bottle.vintage === '1001' ? 'NV' : bottle.vintage
      const dest = bottle.recommended_bin ?? 'destination'
      showToast(
        `${v} ${bottle.wine} → ${dest}`,
        'success',
        () => { if (onUndo) onUndo(barcode) },
      )
    }
  }, [bottles, onDone, onUndo, showToast])

  const handleUndo = useCallback((barcode: string) => {
    const bottle = bottles.find(b => b.barcode === barcode)
    if (onUndo) onUndo(barcode)

    if (bottle) {
      const v = bottle.vintage === '1001' ? 'NV' : bottle.vintage
      showToast(`${v} ${bottle.wine} — undone`, 'info')
    }
  }, [bottles, onUndo, showToast])

  const handleReset = useCallback((barcode: string) => {
    const bottle = bottles.find(b => b.barcode === barcode)
    if (onReset) onReset(barcode)

    if (bottle) {
      const v = bottle.vintage === '1001' ? 'NV' : bottle.vintage
      showToast(`${v} ${bottle.wine} — reset to pending`, 'info')
    }
  }, [bottles, onReset, showToast])

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
          aria-label="Search your wine collection"
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
                <SearchResultCard key={r.bottle.barcode} result={r} onDone={handleDone} onUndo={handleUndo} onReset={handleReset} />
              ))}
            </div>
          )}

          {results.inProgress.length > 0 && (
            <div className="search-panel__tier search-panel__tier--muted">
              <div className="search-panel__tier-header">IN PROGRESS ({results.inProgress.length})</div>
              {results.inProgress.map((r) => (
                <SearchResultCard key={r.bottle.barcode} result={r} onDone={handleDone} onUndo={handleUndo} onReset={handleReset} />
              ))}
            </div>
          )}

          {results.noMove.length > 0 && (
            <div className="search-panel__tier search-panel__tier--dim">
              <div className="search-panel__tier-header">NO MOVE NEEDED ({results.noMove.length})</div>
              {noMoveVisible.map((r) => (
                <SearchResultCard key={r.bottle.barcode} result={r} onDone={handleDone} onUndo={handleUndo} onReset={handleReset} />
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
        <div className={`search-panel__toast search-panel__toast--${toast.type}`}>
          <span>{toast.message}</span>
          {toast.undoAction && (
            <button className="search-panel__toast-undo" onClick={() => { toast.undoAction!(); dismissToast() }}>
              Undo
            </button>
          )}
        </div>
      )}
    </div>
  )
}
