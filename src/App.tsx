import { useState } from 'react'
import { useBottles, groupByShelf } from './hooks/useBottles'
import { useMoveActions } from './hooks/useMoveActions'
import { Overview } from './components/Overview'
import { ShelfGroup } from './components/ShelfGroup'
import { ModeToggle } from './components/ModeToggle'
import { HomeView } from './components/HomeView'
import { SearchPanel } from './components/SearchPanel'
import './App.css'

type View = 'overview' | 'source' | 'home'

export default function App() {
  const [mode, setMode] = useState<'packing' | 'unpacking'>('packing')
  const [view, setView] = useState<View>('overview')
  const [selectedSource, setSelectedSource] = useState<string | null>(null)

  const { bottles: moveBottles, loading: moveLoading, error: moveError, updateBottleLocally } = useBottles({ type: 'needs-move' })
  const { bottles: homeBottles, loading: homeLoading, error: homeError } = useBottles({ type: 'home' })
  const { pack, unpack, shelve, packBatch, shelveBatch } = useMoveActions()
  const error = moveError || homeError

  const handleAction = (barcode: string) => {
    const bottle = moveBottles.find((b) => b.barcode === barcode)
    if (!bottle) return
    if (mode === 'packing') {
      if (bottle.state === 'packed') {
        updateBottleLocally(barcode, { state: 'pending', packed_at: null })
        unpack(barcode)
      } else {
        updateBottleLocally(barcode, { state: 'packed', packed_at: new Date().toISOString() })
        pack(barcode)
      }
    } else {
      updateBottleLocally(barcode, { state: 'shelved', shelved_at: new Date().toISOString() })
      shelve(barcode)
    }
  }

  const handleBatchAction = (barcodes: string[]) => {
    const newState = mode === 'packing' ? 'packed' : 'shelved'
    const tsField = mode === 'packing' ? 'packed_at' : 'shelved_at'
    for (const bc of barcodes) {
      updateBottleLocally(bc, { state: newState, [tsField]: new Date().toISOString() } as Partial<typeof moveBottles[0]>)
    }
    if (mode === 'packing') packBatch(barcodes)
    else shelveBatch(barcodes)
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
        <h1 className="app__title">Wine Cellar Tracker</h1>
        <nav className="app__nav">
          <button className={view === 'overview' || view === 'source' ? 'active' : ''} onClick={() => { setView('overview'); setSelectedSource(null) }}>
            Moves
          </button>
          <button className={view === 'home' ? 'active' : ''} onClick={() => setView('home')}>
            Home
          </button>
        </nav>
      </header>

      <SearchPanel bottles={[...moveBottles, ...homeBottles]} mode={mode} onPack={(barcode) => {
        const bottle = moveBottles.find(b => b.barcode === barcode)
        if (bottle) {
          updateBottleLocally(barcode, { state: 'packed', packed_at: new Date().toISOString() })
          pack(barcode)
        }
      }} />

      {error && <div className="app__error" role="alert">Error: {error.message}</div>}
      {loading && !error && <div className="app__loading">Loading...</div>}

      {!loading && view === 'overview' && (
        <>
          <ModeToggle mode={mode} onToggle={setMode} />
          <Overview bottles={moveBottles} onSelectSource={handleSelectSource} />
        </>
      )}

      {!loading && view === 'source' && (
        <>
          <div className="app__source-header">
            <button className="app__back" onClick={() => { setView('overview'); setSelectedSource(null) }}>← Back</button>
            <h2>{selectedSource}</h2>
          </div>
          <ModeToggle mode={mode} onToggle={setMode} />
          {[...shelves.entries()]
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([shelfName, shelfBottles]) => (
              <ShelfGroup
                key={shelfName}
                shelfName={shelfName}
                bottles={shelfBottles}
                mode={mode}
                onAction={handleAction}
                onBatchAction={handleBatchAction}
              />
            ))}
        </>
      )}

      {!loading && view === 'home' && <HomeView bottles={homeBottles} />}
    </div>
  )
}
