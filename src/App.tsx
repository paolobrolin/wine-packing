import { useState, useRef, useEffect } from 'react'
import { useBottles, groupByShelf } from './hooks/useBottles'
import { useMoveActions } from './hooks/useMoveActions'
import { useToast } from './hooks/useToast'
import { Overview } from './components/Overview'
import { ShelfGroup } from './components/ShelfGroup'
import { HomeView } from './components/HomeView'
import { SearchPanel } from './components/SearchPanel'
import { OverrideSheet } from './components/OverrideSheet'
import { inferTransition, reverseTransition } from './rules/state-machine'
import { actionLabel } from './data/models'
import type { DbBottle } from './data/models'
import './App.css'

type View = 'overview' | 'source' | 'home'

function dedupeBottles(primary: DbBottle[], secondary: DbBottle[]): DbBottle[] {
  const seen = new Set(primary.map(b => b.barcode))
  return [...primary, ...secondary.filter(b => !seen.has(b.barcode))]
}

export default function App() {
  const [view, setView] = useState<View>('overview')
  const [selectedSource, setSelectedSource] = useState<string | null>(null)
  const [overrideBottle, setOverrideBottle] = useState<DbBottle | null>(null)
  const scrollPositions = useRef<Record<string, number>>({})

  const navigateTo = (nextView: View, source?: string | null) => {
    scrollPositions.current[view] = window.scrollY
    setView(nextView)
    if (source !== undefined) setSelectedSource(source)
  }

  useEffect(() => {
    const saved = scrollPositions.current[view]
    if (saved != null) {
      requestAnimationFrame(() => window.scrollTo(0, saved))
    } else {
      window.scrollTo(0, 0)
    }
  }, [view])

  const { bottles: moveBottles, loading: moveLoading, error: moveError, updateBottleLocally } = useBottles({ type: 'needs-move' })
  const { bottles: homeBottles, loading: homeLoading, error: homeError } = useBottles({ type: 'home' })
  const { pack, unpack, shelve, sync } = useMoveActions()
  const { toast, show: showToast, dismiss: dismissToast } = useToast()
  const error = moveError || homeError

  const handleDone = (barcode: string) => {
    const bottle = [...moveBottles, ...homeBottles].find((b) => b.barcode === barcode)
    if (!bottle) return

    setOverrideBottle(bottle)
  }

  const handleConfirmDone = (barcode: string, destBin: string | null) => {
    const bottle = [...moveBottles, ...homeBottles].find((b) => b.barcode === barcode)
    if (!bottle) { setOverrideBottle(null); return }

    const effectiveBin = destBin ?? bottle.recommended_bin
    const label = actionLabel(bottle)
    const nextState = inferTransition(bottle)
    const tsField = nextState === 'packed' ? 'packed_at'
      : nextState === 'shelved' ? 'shelved_at'
      : nextState === 'synced' ? 'synced_at' : null

    updateBottleLocally(barcode, {
      state: nextState,
      recommended_bin: effectiveBin,
      current_bin: effectiveBin,
      ...(tsField ? { [tsField]: new Date().toISOString() } : {}),
    } as Partial<typeof bottle>)

    const extra = effectiveBin ? { current_bin: effectiveBin } : undefined
    if (nextState === 'packed') pack(barcode, extra)
    else if (nextState === 'shelved') shelve(barcode, extra)
    else if (nextState === 'synced') sync(barcode, extra)

    const v = bottle.vintage === '1001' ? 'NV' : bottle.vintage
    const prevState = bottle.state
    const prevBin = bottle.current_bin
    showToast(
      `${v} ${bottle.wine} — ${label === 'Move' ? 'moved' : label === 'Place' ? 'placed' : 'packed'} → ${effectiveBin ?? ''}`,
      'success',
      () => {
        updateBottleLocally(barcode, {
          state: prevState,
          current_bin: prevBin,
          packed_at: prevState === 'pending' ? null : bottle.packed_at,
          shelved_at: prevState === 'pending' || prevState === 'packed' ? null : bottle.shelved_at,
        } as Partial<typeof bottle>)
        unpack(barcode)
        showToast(`${v} ${bottle.wine} — undone`, 'info')
      },
    )
    setOverrideBottle(null)
  }

  const handleUndo = (barcode: string) => {
    const bottle = [...moveBottles, ...homeBottles].find((b) => b.barcode === barcode)
    if (!bottle) return
    const prevState = reverseTransition(bottle.state)
    updateBottleLocally(barcode, {
      state: prevState,
      packed_at: prevState === 'pending' ? null : bottle.packed_at,
    } as Partial<typeof bottle>)
    unpack(barcode)
  }

  const handleBatchDone = (barcodes: string[]) => {
    for (const bc of barcodes) {
      handleDone(bc)
    }
  }

  const handleSelectSource = (source: string) => {
    navigateTo('source', source)
  }

  const filteredBottles = selectedSource
    ? moveBottles.filter((b) => (b.current_bin ?? b.current_location ?? 'Unknown') === selectedSource)
    : moveBottles

  const shelves = groupByShelf(filteredBottles)
  const loading = moveLoading || homeLoading

  return (
    <div className="app">
      <header className="app__header">
        <h1 className="app__title">Vinflytt</h1>
        <nav className="app__nav">
          <button className={view === 'overview' || view === 'source' ? 'active' : ''} onClick={() => navigateTo('overview', null)}>
            Tasks
          </button>
          <button className={view === 'home' ? 'active' : ''} onClick={() => navigateTo('home')}>
            Cellar
          </button>
        </nav>
      </header>

      <SearchPanel
        bottles={dedupeBottles(moveBottles, homeBottles)}
        onDone={handleDone}
        onUndo={handleUndo}
      />

      {error && <div className="app__error" role="alert">Error: {error.message}</div>}
      {loading && !error && <div className="app__loading">Loading...</div>}

      {!loading && view === 'overview' && (
        <Overview bottles={moveBottles} onSelectSource={handleSelectSource} />
      )}

      {!loading && view === 'source' && (
        <>
          <div className="app__source-header">
            <button className="app__back" onClick={() => navigateTo('overview', null)}>← Back</button>
            <h2>{selectedSource}</h2>
          </div>
          {[...shelves.entries()]
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([shelfName, shelfBottles]) => (
              <ShelfGroup
                key={shelfName}
                shelfName={shelfName}
                bottles={shelfBottles}
                onDone={handleDone}
                onBatchDone={handleBatchDone}
                onUndo={handleUndo}
              />
            ))}
        </>
      )}

      {!loading && view === 'home' && <HomeView bottles={homeBottles} />}

      {overrideBottle && (
        <OverrideSheet
          bottle={overrideBottle}
          onConfirm={handleConfirmDone}
          onKeep={async (barcode) => {
            updateBottleLocally(barcode, {
              state: 'synced',
              recommended_location: null,
              recommended_bin: null,
            } as Partial<DbBottle>)
            const { dismissRecommendation } = await import('./data/queries')
            dismissRecommendation(barcode)
            const b = overrideBottle
            const v = b.vintage === '1001' ? 'NV' : b.vintage
            showToast(`${v} ${b.wine} — kept in place`, 'info')
            setOverrideBottle(null)
          }}
          onCancel={() => setOverrideBottle(null)}
        />
      )}

      {toast && (
        <div className={`app__toast app__toast--${toast.type}`} role="status">
          <span>{toast.message}</span>
          {toast.undoAction && (
            <button className="app__toast-undo" onClick={() => { toast.undoAction!(); dismissToast() }}>
              Undo
            </button>
          )}
        </div>
      )}
    </div>
  )
}
