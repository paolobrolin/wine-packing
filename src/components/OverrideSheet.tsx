import { useState } from 'react'
import { allBinsGrouped } from '../bins/all-bins'
import { displayVintage } from '../data/format'
import type { DbBottle } from '../data/models'

interface Props {
  bottle: DbBottle
  onConfirm: (barcode: string, overrideBin: string | null) => void
  onKeep: (barcode: string) => void
  onCancel: () => void
}

export function OverrideSheet({ bottle, onConfirm, onKeep, onCancel }: Props) {
  const [selectedBin, setSelectedBin] = useState(bottle.recommended_bin ?? '')
  const groups = allBinsGrouped()
  const currentBin = bottle.current_bin ?? bottle.current_location ?? 'Unknown'

  return (
    <div className="override-sheet__backdrop" onClick={onCancel}>
      <div className="override-sheet" onClick={(e) => e.stopPropagation()} data-testid="override-sheet">
        <div className="override-sheet__handle" />

        <div className="override-sheet__title">
          {displayVintage(bottle.vintage)} {bottle.wine}
        </div>

        <div className="override-sheet__from">
          <span className="override-sheet__label">FROM</span>
          <span>{currentBin}</span>
        </div>

        <div className="override-sheet__to">
          <span className="override-sheet__label">TO</span>
          <select
            className="override-sheet__select"
            value={selectedBin}
            onChange={(e) => setSelectedBin(e.target.value)}
            data-testid="override-select"
          >
            {groups.map((group) => (
              <optgroup key={group.label} label={group.label}>
                {group.bins.map((bin) => (
                  <option key={bin} value={bin}>
                    {bin}
                    {bin === bottle.recommended_bin ? ' ← recommended' : ''}
                    {bin === bottle.current_bin ? ' ← current' : ''}
                  </option>
                ))}
              </optgroup>
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
          <button
            className="override-sheet__keep"
            onClick={() => onKeep(bottle.barcode)}
            data-testid="override-keep"
          >
            Keep here
          </button>
          <button className="override-sheet__cancel" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
