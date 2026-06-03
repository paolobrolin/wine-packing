interface Props {
  mode: 'packing' | 'unpacking'
  onToggle: (mode: 'packing' | 'unpacking') => void
}

export function ModeToggle({ mode, onToggle }: Props) {
  return (
    <div className="mode-toggle" role="radiogroup" aria-label="Mode">
      <button
        className={`mode-toggle__option ${mode === 'packing' ? 'mode-toggle__option--active' : ''}`}
        onClick={() => onToggle('packing')}
        role="radio"
        aria-checked={mode === 'packing'}
      >
        📦 Packing at Home
      </button>
      <button
        className={`mode-toggle__option ${mode === 'unpacking' ? 'mode-toggle__option--active' : ''}`}
        onClick={() => onToggle('unpacking')}
        role="radio"
        aria-checked={mode === 'unpacking'}
      >
        📥 Unpacking at Remote
      </button>
    </div>
  )
}
