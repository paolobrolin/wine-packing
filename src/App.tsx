import { useState } from 'react'
import { useBottles, groupByShelf } from './hooks/useBottles'
import { useMoveActions } from './hooks/useMoveActions'
import { useToast } from './hooks/useToast'
import { Overview } from './components/Overview'
import { ShelfGroup } from './components/ShelfGroup'
import { HomeView } from './components/HomeView'
import { SearchPanel } from './components/SearchPanel'
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

  const { bottles: moveBottles, loading: moveLoading, error: moveError, updateBottleLocally } = useBottles({ type: 'needs-move' })
  const { bottles: homeBottles, loading: homeLoading, error: homeError } = useBottles({ type: 'home' })
  const { pack, unpack, shelve } = useMoveActions()
  const { toast, show: showToast, dismiss: dismissToast } = useToast()
  const error = moveError || homeError

  const handleDone = (barcode: string) => {
    const bottle = [...moveBottles, ...homeBottles].find((b) => b.barcode === barcode)
    if (!bottle) return

    const label = actionLabel(bottle)
    const nextState = inferTransition(bottle)
    const tsField = nextState === 'packed' ? 'packed_at'
      : nextState === 'shelved' ? 'shelved_at'
      : nextState === 'synced' ? 'synced_at' : null

    updateBottleLocally(barcode, {
      state: nextState,
      ...(tsField ? { [tsField]: new Date().toISOString() } : {}),
    } as Partial<typeof bottle>)

    if (nextState === 'packed') pack(barcode)
    else if (nextState === 'shelved') shelve(barcode)
    else if (nextState === 'synced') shelve(barcode)

    const v = bottle.vintage === '1001' ? 'NV' : bottle.vintage
    const dest = bottle.recommended_bin ?? ''
    const prevState = bottle.state
    showToast(
      `${v} ${bottle.wine} — ${label.toLowerCase()}ed → ${dest}`,
      'success',
      () => {
        updateBottleLocally(barcode, {
          state: prevState,
          packed_at: prevState === 'pending' ? null : bottle.packed_at,
          shelved_at: prevState === 'pending' || prevState === 'packed' ? null : bottle.shelved_at,
        } as Partial<typeof bottle>)
        unpack(barcode)
        showToast(`${v} ${bottle.wine} — undone`, 'info')
      },
    )
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
    setSelectedSource(source)
    setView('source')
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
          <button className={view === 'overview' || view === 'source' ? 'active' : ''} onClick={() => { setView('overview'); setSelectedSource(null) }}>
            Tasks
          </button>
          <button className={view === 'home' ? 'active' : ''} onClick={() => setView('home')}>
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
            <button className="app__back" onClick={() => { setView('overview'); setSelectedSource(null) }}>← Back</button>
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
