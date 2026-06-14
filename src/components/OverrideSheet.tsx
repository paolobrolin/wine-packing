import { useState } from 'react'
import { binsForLocation } from '../bins/all-bins'
import { displayVintage } from '../data/format'
import type { DbBottle } from '../data/models'

interface Props {
  bottle: DbBottle
  onConfirm: (barcode: string, overrideBin: string | null) => void
  onCancel: () => void
}

export function OverrideSheet({ bottle, onConfirm, onCancel }: Props) {
  const [selectedBin, setSelectedBin] = useState(bottle.recommended_bin ?? '')
  const bins = binsForLocation(bottle.recommended_location)

  return (
    <div className="override-sheet__backdrop" onClick={onCancel}>
      <div className="override-sheet" onClick={(e) => e.stopPropagation()} data-testid="override-sheet">
        <div className="override-sheet__handle" />

        <div className="override-sheet__title">
          {displayVintage(bottle.vintage)} {bottle.wine}
        </div>

        <div className="override-sheet__from">
          <span className="override-sheet__label">FROM</span>
          <span>{bottle.current_bin ?? bottle.current_location ?? 'Unknown'}</span>
        </div>

        <div className="override-sheet__to">
          <span className="override-sheet__label">TO</span>
          <select
            className="override-sheet__select"
            value={selectedBin}
            onChange={(e) => setSelectedBin(e.target.value)}
            data-testid="override-select"
          >
            {bins.map((bin) => (
              <option key={bin} value={bin}>
                {bin}{bin === bottle.recommended_bin ? ' (recommended)' : ''}
                {bin === bottle.current_bin ? ' (current)' : ''}
              </option>
            ))}
          </select>
        </div>

        <div className="override-sheet__actions">
          <button
            className="override-sheet__confirm"
            onClick={() => onConfirm(bottle.barcode, selectedBin !== bottle.recommended_bin ? selectedBin : null)}
            data-testid="override-confirm"
          >
            Confirm
          </button>
          <button className="override-sheet__cancel" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
