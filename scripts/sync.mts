/**
 * CT → Supabase sync runner.
 *
 * Usage:
 *   1. Export in-stock bottles from CT MCP (list_bottles bottle_state=1),
 *      filter store="E2E Test", save as JSON array to /tmp/ct_bottles.json
 *   2. npx tsx scripts/sync.mts
 *
 * Reads Supabase credentials from ~/.claude-private/supabase/.
 * Fetches ALL existing rows (paginated — PostgREST caps at 1000/request),
 * runs buildSyncRows, upserts in batches, deletes orphans (consumed bottles).
 */
import { buildSyncRows, type CtBottle } from '../src/data/sync.js'
import type { DbBottle } from '../src/data/models.js'
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { homedir } from 'os'
import { join } from 'path'

const credDir = join(homedir(), '.claude-private', 'supabase')
const url = readFileSync(join(credDir, 'project-url'), 'utf8').trim()
// The secret key, not the publishable one: these run locally and do the bulk
// writes and the orphan deletes that the app itself never performs, so they
// bypass RLS instead of holding a session.
const key = readFileSync(join(credDir, 'secret-key'), 'utf8').trim()
const sb = createClient(url, key)

const raw = JSON.parse(readFileSync('/tmp/ct_bottles.json', 'utf8'))
const ctBottles: CtBottle[] = raw.map((b: Record<string, unknown>) => ({
  barcode: b.barcode, iwine: b.iwine, size: b.size,
  location: b.location || null, bin: b.bin || null,
  bottle_cost: b.bottle_cost, bottle_cost_currency: b.bottle_cost_currency,
  begin_consume: b.begin_consume, end_consume: b.end_consume,
  bottle_note: b.bottle_note || null, purchase_note: b.purchase_note || null,
  extra: b.extra,
})) as CtBottle[]

type ExistingRow = Pick<DbBottle, 'barcode' | 'state' | 'packed_at' | 'in_transit_at' | 'shelved_at' | 'synced_at' | 'trip_id' | 'owc_group' | 'estimated_value' | 'value_source' | 'label_ref'>

// iwine → CT bottle image ref. Harvested by scripts/harvest-labels.mts (no CT
// export carries it), stored per wine so it survives bottles being drunk and
// rebought. A null ref means "checked, CT has no image" — skip those so they
// never overwrite anything.
const labelRefs = new Map<number, string>()
for (let from = 0; ; from += 1000) {
  const { data, error } = await sb.from('wine_labels')
    .select('iwine, label_ref').order('iwine').range(from, from + 999)
  if (error) { console.error('wine_labels:', error); break }
  for (const r of data ?? []) {
    if (r.label_ref != null) labelRefs.set(r.iwine as number, r.label_ref as string)
  }
  if (!data || data.length < 1000) break
}
console.log(`Etikettbilder: ${labelRefs.size} viner`)

// PostgREST caps responses at 1000 rows — paginate to get everything.
const PAGE = 1000
const existingMap = new Map<string, ExistingRow>()
for (let from = 0; ; from += PAGE) {
  const { data, error } = await sb.from('bottles')
    .select('barcode, state, packed_at, in_transit_at, shelved_at, synced_at, trip_id, owc_group, estimated_value, value_source, label_ref')
    .order('barcode')
    .range(from, from + PAGE - 1)
  if (error) { console.error(error); process.exit(1) }
  for (const row of data ?? []) existingMap.set(row.barcode, row as ExistingRow)
  if (!data || data.length < PAGE) break
}

console.log(`CT: ${ctBottles.length}, Supabase: ${existingMap.size}`)
if (existingMap.size > 0 && existingMap.size % PAGE === 0) {
  console.warn('WARNING: existing row count is a multiple of page size — verify pagination fetched everything')
}

const { rows, stats } = buildSyncRows(ctBottles, existingMap, new Date().getFullYear(), undefined, labelRefs)
console.log('Stats:', JSON.stringify(stats, null, 2))

if (stats.orphanedBarcodes.length > 0) {
  const { error: delErr } = await sb.from('bottles').delete().in('barcode', stats.orphanedBarcodes)
  if (delErr) console.error('Delete error:', delErr)
  else console.log(`Deleted ${stats.orphanedBarcodes.length} orphans (consumed/removed in CT)`)
}

const BATCH = 100
let upserted = 0
for (let i = 0; i < rows.length; i += BATCH) {
  const batch = rows.slice(i, i + BATCH)
  const { error } = await sb.from('bottles').upsert(batch, { onConflict: 'barcode' })
  if (error) { console.error(`Batch ${i}:`, error); continue }
  upserted += batch.length
}
console.log(`Upserted: ${upserted}`)
