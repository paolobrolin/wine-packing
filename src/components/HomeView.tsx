import type { DbBottle } from '../data/models'
import { moveType } from '../data/models'
import { displayVintage } from '../data/format'

interface Props {
  bottles: DbBottle[]
}

function drinkUrgency(bottle: DbBottle, currentYear: number): 'past-peak' | 'approaching' | 'ok' | 'unknown' {
  if (bottle.end_consume == null) return 'unknown'
  if (bottle.end_consume <= currentYear) return 'past-peak'

  const begin = bottle.begin_consume ?? currentYear
  const end = bottle.end_consume
  const midpoint = (begin + end) / 2
  if (midpoint <= currentYear + 1) return 'approaching'
  return 'ok'
}

function groupByBin(bottles: DbBottle[]): Map<string, DbBottle[]> {
  const groups = new Map<string, DbBottle[]>()
  for (const b of bottles) {
    const bin = b.recommended_bin ?? b.current_bin ?? 'Unassigned'
    const list = groups.get(bin) ?? []
    list.push(b)
    groups.set(bin, list)
  }
  return groups
}

function BottleRow({ bottle, currentYear }: { bottle: DbBottle; currentYear: number }) {
  const urgency = drinkUrgency(bottle, currentYear)
  const mt = moveType(bottle)
  const mid = ((bottle.begin_consume ?? currentYear) + (bottle.end_consume ?? currentYear + 10)) / 2
  const monthsToMid = Math.round((mid - currentYear) * 12)

  return (
    <div className={`home-view__bottle home-view__bottle--${urgency}`}>
      <div className="home-view__name">{displayVintage(bottle.vintage)} {bottle.wine}</div>
      <div className="home-view__detail">
        {urgency === 'past-peak' && `Past peak (${bottle.end_consume}) · ${currentYear - (bottle.end_consume ?? currentYear)}y over`}
        {urgency === 'approaching' && `Peak in ${monthsToMid} months`}
        {mt === 'within-location' && (
          <span className="home-view__rebin-badge"> · rebin → {bottle.recommended_bin}</span>
        )}
      </div>
    </div>
  )
}

function BinGroup({ binName, bottles, currentYear }: { binName: string; bottles: DbBottle[]; currentYear: number }) {
  return (
    <div className="home-view__bin-group">
      <div className="home-view__bin-label">{binName} ({bottles.length})</div>
      {bottles.map((b) => <BottleRow key={b.barcode} bottle={b} currentYear={currentYear} />)}
    </div>
  )
}

export function HomeView({ bottles }: Props) {
  const currentYear = new Date().getFullYear()

  const rebinCount = bottles.filter((b) => moveType(b) === 'within-location').length
  const pastPeak = bottles.filter((b) => drinkUrgency(b, currentYear) === 'past-peak')
  const approaching = bottles.filter((b) => drinkUrgency(b, currentYear) === 'approaching')
  const ok = bottles.filter((b) => drinkUrgency(b, currentYear) === 'ok' || drinkUrgency(b, currentYear) === 'unknown')

  const pastPeakBins = groupByBin(pastPeak)
  const approachingBins = groupByBin(approaching)

  return (
    <div className="home-view">
      {rebinCount > 0 && (
        <div className="home-view__rebin-alert" role="alert">
          {rebinCount} bottle{rebinCount !== 1 ? 's' : ''} need rebinning
        </div>
      )}

      {pastPeak.length > 0 && (
        <section className="home-view__section home-view__section--urgent">
          <h3 className="home-view__section-title">
            Drink Now ({pastPeak.length})
          </h3>
          {[...pastPeakBins.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([bin, binBottles]) => (
            <BinGroup key={bin} binName={bin} bottles={binBottles} currentYear={currentYear} />
          ))}
        </section>
      )}

      {approaching.length > 0 && (
        <section className="home-view__section home-view__section--approaching">
          <h3 className="home-view__section-title">
            Approaching Peak ({approaching.length})
          </h3>
          {[...approachingBins.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([bin, binBottles]) => (
            <BinGroup key={bin} binName={bin} bottles={binBottles} currentYear={currentYear} />
          ))}
        </section>
      )}

      <section className="home-view__section">
        <h3 className="home-view__section-title">
          Correctly Stored ({ok.length})
        </h3>
        <div className="home-view__collapsed">{ok.length} bottles — no action needed</div>
      </section>
    </div>
  )
}
