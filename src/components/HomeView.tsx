import type { DbBottle } from '../data/models'

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

export function HomeView({ bottles }: Props) {
  const currentYear = new Date().getFullYear()

  const pastPeak = bottles.filter((b) => drinkUrgency(b, currentYear) === 'past-peak')
  const approaching = bottles.filter((b) => drinkUrgency(b, currentYear) === 'approaching')
  const ok = bottles.filter((b) => drinkUrgency(b, currentYear) === 'ok' || drinkUrgency(b, currentYear) === 'unknown')

  return (
    <div className="home-view">
      {pastPeak.length > 0 && (
        <section className="home-view__section home-view__section--urgent">
          <h3 className="home-view__section-title">
            🔴 Drink Now ({pastPeak.length})
          </h3>
          {pastPeak.map((b) => (
            <div key={b.barcode} className="home-view__bottle home-view__bottle--urgent">
              <div className="home-view__name">{b.vintage} {b.wine}</div>
              <div className="home-view__detail">
                Past peak ({b.end_consume}) · {currentYear - (b.end_consume ?? currentYear)}y over
              </div>
            </div>
          ))}
        </section>
      )}

      {approaching.length > 0 && (
        <section className="home-view__section home-view__section--approaching">
          <h3 className="home-view__section-title">
            🟡 Approaching Peak ({approaching.length})
          </h3>
          {approaching.map((b) => {
            const mid = ((b.begin_consume ?? currentYear) + (b.end_consume ?? currentYear + 10)) / 2
            const monthsToMid = Math.round((mid - currentYear) * 12)
            return (
              <div key={b.barcode} className="home-view__bottle home-view__bottle--approaching">
                <div className="home-view__name">{b.vintage} {b.wine}</div>
                <div className="home-view__detail">Peak in {monthsToMid} months</div>
              </div>
            )
          })}
        </section>
      )}

      <section className="home-view__section">
        <h3 className="home-view__section-title">
          🟢 Correctly Stored ({ok.length})
        </h3>
        <div className="home-view__collapsed">{ok.length} bottles — no action needed</div>
      </section>
    </div>
  )
}
