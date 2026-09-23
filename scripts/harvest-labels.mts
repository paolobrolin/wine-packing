/**
 * CT → wine_labels harvester.
 *
 * Fetches the bottle image ref for every wine in `bottles` that has no row in
 * `wine_labels` yet, then denormalises the result onto `bottles.label_ref`.
 *
 * The ref is in no CT export — verified 2026-09-10 that xlquery.asp Inventory
 * has no image column — only in the `editwine.asp` page, so this reads that
 * page using the browser session cookies in
 * ~/.claude-private/cellartracker/ct-session-cookies.json. `aws-waf-token` is
 * the cookie that makes it work, and it expires: when it does, requests come
 * back 200 with a near-empty body and the run aborts after 3 in a row.
 *
 * Deliberately serial with a 1.5 s pace. robots.txt disallows /editwine.asp,
 * and a request storm produced an IP block lasting over 8 h on 2026-08-03. A
 * row is written even for wines CT has no image for, so each wine is fetched
 * at most once.
 *
 * Usage:
 *   npx tsx scripts/harvest-labels.mts [--all] [--limit N] [--dry-run]
 */
import { parseLabelRef, looksBlocked } from '../src/data/labels.js'
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { homedir } from 'os'
import { join } from 'path'

const args = process.argv.slice(2)
const ALL = args.includes('--all')
const DRY = args.includes('--dry-run')
const LIMIT = (() => {
  const i = args.indexOf('--limit')
  return i >= 0 ? Number(args[i + 1]) : Infinity
})()
const PACE_MS = 1500
const ABORT_AFTER = 3

const credDir = join(homedir(), '.claude-private', 'supabase')
const sb = createClient(
  readFileSync(join(credDir, 'project-url'), 'utf8').trim(),
  // Secret key: this writes wine_labels, which the app never does.
  readFileSync(join(credDir, 'secret-key'), 'utf8').trim(),
)

type Cookie = { name: string; value: string }
const cookiePath = join(homedir(), '.claude-private', 'cellartracker', 'ct-session-cookies.json')
const cookies: Cookie[] = JSON.parse(readFileSync(cookiePath, 'utf8'))
const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join('; ')
if (!cookies.some((c) => c.name === 'aws-waf-token')) {
  console.error('aws-waf-token saknas i cookie-filen — editwine.asp svarar tomt utan den.')
  process.exit(1)
}

/** PostgREST caps responses at 1000 rows — paginate. */
async function readAll<T>(table: string, cols: string, orderBy: string): Promise<T[]> {
  const out: T[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb.from(table).select(cols).order(orderBy).range(from, from + 999)
    if (error) { console.error(`${table}:`, error); process.exit(1) }
    out.push(...((data ?? []) as T[]))
    if (!data || data.length < 1000) break
  }
  return out
}

const bottles = await readAll<{ iwine: number; wine: string; vintage: string; label_ref: string | null }>(
  'bottles', 'iwine, wine, vintage, label_ref', 'barcode')
const checked = new Set((await readAll<{ iwine: number }>('wine_labels', 'iwine', 'iwine')).map((r) => r.iwine))

const wines = new Map<number, { wine: string; vintage: string }>()
for (const b of bottles) if (!wines.has(b.iwine)) wines.set(b.iwine, { wine: b.wine, vintage: b.vintage })

const todo = [...wines.keys()].filter((iw) => ALL || !checked.has(iw)).slice(0, LIMIT)
console.log(`Viner i källaren: ${wines.size}, redan kontrollerade: ${checked.size}, att hämta: ${todo.length}`)
if (todo.length === 0) process.exit(0)
if (DRY) {
  for (const iw of todo) console.log(`  ${iw}  ${wines.get(iw)!.vintage} ${wines.get(iw)!.wine}`)
  process.exit(0)
}

const found = new Map<number, string | null>()
let consecutiveBlocked = 0

for (const [i, iwine] of todo.entries()) {
  if (i > 0) await new Promise((r) => setTimeout(r, PACE_MS))
  const res = await fetch(`https://www.cellartracker.com/editwine.asp?iWine=${iwine}`, {
    headers: {
      Cookie: cookieHeader,
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36',
      Referer: 'https://www.cellartracker.com/list.asp',
    },
  })
  const body = await res.text()

  if (looksBlocked(res.status, body.length)) {
    consecutiveBlocked++
    console.warn(`  ${iwine}  BLOCKERAD (${res.status}, ${body.length} tecken) ${consecutiveBlocked}/${ABORT_AFTER}`)
    if (consecutiveBlocked >= ABORT_AFTER) {
      console.error(`\nAvbryter efter ${ABORT_AFTER} blockerade svar i rad. Förnya aws-waf-token i ${cookiePath}.`)
      break
    }
    continue
  }
  consecutiveBlocked = 0

  const ref = parseLabelRef(body)
  found.set(iwine, ref)
  const w = wines.get(iwine)!
  console.log(`  ${iwine}  ${ref ?? 'ingen bild'}  ${w.vintage} ${w.wine}`)
}

if (found.size === 0) { console.log('Inget hämtat.'); process.exit(1) }

// A row is written even when ref is null: "kontrollerad, ingen bild" differs
// from "aldrig kontrollerad", and only the latter should be re-fetched.
const labelRows = [...found].map(([iwine, label_ref]) => ({ iwine, label_ref, updated_at: new Date().toISOString() }))
const { error: upErr } = await sb.from('wine_labels').upsert(labelRows, { onConflict: 'iwine' })
if (upErr) { console.error('wine_labels:', upErr); process.exit(1) }

let backfilled = 0
for (const [iwine, ref] of found) {
  if (ref == null) continue
  const { error, count } = await sb.from('bottles')
    .update({ label_ref: ref }, { count: 'exact' }).eq('iwine', iwine)
  if (error) { console.error(`bottles ${iwine}:`, error); continue }
  backfilled += count ?? 0
}

const withImage = [...found.values()].filter((r) => r != null).length
console.log(`\nwine_labels: ${labelRows.length} rader (${withImage} med bild, ${labelRows.length - withImage} utan)`)
console.log(`bottles.label_ref uppdaterade: ${backfilled}`)
